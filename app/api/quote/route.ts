
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

/**
 * v7 FINAL BUSINESS LOGIC
 * - Todos los proveedores
 * - Dedupe por (tire_id) quedándonos con el proveedor MÁS BARATO
 * - NO mostrar opciones que no puedan cumplir requestedQty
 * - stock >= requestedQty obligatorio
 * - stock >= minStock obligatorio
 * - Gama automática: Económica / Media / Premium (por precio relativo)
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ===============================
    // 1️⃣ Obtener líneas (compatibilidad)
    // ===============================
    let lines: any[] = [];
    if (Array.isArray(body?.lines)) {
      lines = body.lines;
    } else if (Array.isArray(body?.draft?.vehicles)) {
      lines = body.draft.vehicles.flatMap((v: any) => v.lines ?? []);
    }

    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "No lines provided" }, { status: 400 });
    }

    const requestedLines = lines.map((l: any) => ({
      size: normalizeSizeAny(l.size),
      rawSize: l.size,
      qty: Number(l.qty ?? 0),
      vehicleMake: l.vehicleMake ?? null,
      vehicleModel: l.vehicleModel ?? null,
      vehicleYear: l.vehicleYear ?? null,
    })).filter(l => l.qty > 0);

    if (!requestedLines.length) {
      return NextResponse.json({ ok: false, error: "No valid quantities" }, { status: 400 });
    }

    // ===============================
    // 2️⃣ Parámetros negocio
    // ===============================
    const minStock = Number(body?.minStock ?? 1);
    const markupPct = Number(body?.markup ?? 30) / 100;

    // ===============================
    // 3️⃣ Obtener TODOS los providers
    // ===============================
    const { data: provRows } = await supabaseAdmin
      .from("offers")
      .select("provider")
      .neq("provider", null);

    const providers = Array.from(new Set((provRows ?? []).map((p: any) => p.provider)));

    // ===============================
    // 4️⃣ Procesar cada línea
    // ===============================
    const linesOut: any[] = [];

    for (let lineIdx = 0; lineIdx < requestedLines.length; lineIdx++) {
      const ln = requestedLines[lineIdx];

      // traer TODAS las ofertas por size
      const { data: offers } = await supabaseAdmin
        .from("offers")
        .select("provider,tire_id,brand,model,load_speed,size,stock,cost,snapshot_date")
        .eq("size", ln.size)
        .order("snapshot_date", { ascending: false });

      if (!offers || !offers.length) {
        linesOut.push({
          lineId: String(lineIdx),
          size: ln.rawSize,
          requestedQty: ln.qty,
          vehicleMake: ln.vehicleMake,
          vehicleModel: ln.vehicleModel,
          vehicleYear: ln.vehicleYear,
          options: [],
        });
        continue;
      }

      // ===============================
      // 5️⃣ DEDUPE: por tire_id quedarse con proveedor más barato
      // ===============================
      const byTire = new Map<string, any>();

      for (const o of offers) {
        const stock = Number(o.stock ?? 0);
        if (stock < ln.qty) continue;        // NO alcanza para cotizar
        if (stock < minStock) continue;      // NO cumple stock mínimo
        if (o.cost == null) continue;

        const priceEach = Math.round(Number(o.cost) * (1 + markupPct));

        const existing = byTire.get(o.tire_id);
        if (!existing || priceEach < existing.priceEach) {
          byTire.set(o.tire_id, {
            provider: o.provider,
            brand: o.brand,
            model: o.model,
            loadSpeed: o.load_speed,
            stock,
            quotedQty: ln.qty,
            priceEach,
            totalTires: priceEach * ln.qty,
          });
        }
      }

      let opts = Array.from(byTire.values());

      // ===============================
      // 6️⃣ GAMA AUTOMÁTICA (precio relativo)
      // ===============================
      const prices = opts.map(o => o.priceEach).sort((a, b) => a - b);

      const p33 = prices[Math.floor(prices.length * 0.33)] ?? 0;
      const p66 = prices[Math.floor(prices.length * 0.66)] ?? 0;

      opts = opts.map((o, j) => {
        let tier = "Media";
        if (o.priceEach <= p33) tier = "Económica";
        else if (o.priceEach > p66) tier = "Premium";

        return {
          quoteItemId: `${lineIdx}-${j}`,
          tierLabel: tier,
          brand: o.brand,
          model: o.model,
          loadSpeed: o.loadSpeed,
          stock: o.stock,
          quotedQty: o.quotedQty,
          priceEach: o.priceEach,
          totalTires: o.totalTires,
          included: true,
        };
      });

      // ordenar por gama + precio
      const tierOrder = { "Económica": 1, "Media": 2, "Premium": 3 };
      opts.sort((a, b) =>
        tierOrder[a.tierLabel] - tierOrder[b.tierLabel] ||
        a.priceEach - b.priceEach
      );

      linesOut.push({
        lineId: String(lineIdx),
        size: ln.rawSize,
        requestedQty: ln.qty,
        vehicleMake: ln.vehicleMake,
        vehicleModel: ln.vehicleModel,
        vehicleYear: ln.vehicleYear,
        options: opts,
      });
    }

    return NextResponse.json({
      ok: true,
      quoteId: crypto.randomUUID(),
      quoteNumber: "BORRADOR",
      lines: linesOut,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
