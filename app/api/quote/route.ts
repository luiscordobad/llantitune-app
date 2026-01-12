
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1️⃣ Obtener lines (compatibles viejo y nuevo)
    let lines: any[] = [];
    if (Array.isArray(body?.lines)) {
      lines = body.lines;
    } else if (Array.isArray(body?.draft?.vehicles)) {
      lines = body.draft.vehicles.flatMap((v: any) => v.lines ?? []);
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ ok: false, error: "No lines provided" }, { status: 400 });
    }

    // 2️⃣ Providers (fallback automático)
    let providers: string[] = [];
    if (Array.isArray(body?.providers) && body.providers.length > 0) {
      providers = body.providers;
    } else {
      const { data } = await supabaseAdmin
        .from("offers")
        .select("provider")
        .neq("provider", null);

      providers = Array.from(new Set((data ?? []).map((p: any) => p.provider)));
    }

    const minStock = Number(body?.minStock ?? 1);
    const markupPct = Number(body?.markup ?? 30) / 100;

    // 3️⃣ Buscar todas las ofertas
    const flatOptions: any[] = [];

    for (const ln of lines) {
      const size = normalizeSizeAny(ln.size);
      const requestedQty = Number(ln.qty ?? 1);

      for (const provider of providers) {
        const { data } = await supabaseAdmin
          .from("offers")
          .select("provider,tire_id,brand,model,load_speed,size,stock,cost,snapshot_date")
          .eq("provider", provider)
          .eq("size", size)
          .order("snapshot_date", { ascending: false });

        if (!data) continue;

        const latest = new Map<string, any>();
        for (const row of data) {
          if (!latest.has(row.tire_id)) latest.set(row.tire_id, row);
        }

        for (const o of latest.values()) {
          const stock = Number(o.stock ?? 0);
          if (stock < minStock) continue;

          const quotedQty = Math.min(stock, requestedQty);
          const priceEach = Math.round(Number(o.cost) * (1 + markupPct));

          flatOptions.push({
            size,
            provider: o.provider,
            brand: o.brand,
            model: o.model,
            loadSpeed: o.load_speed,
            stock,
            quotedQty,
            priceEach,
            totalTires: priceEach * quotedQty,
          });
        }
      }
    }

    // 4️⃣ Construir estructura EXACTA que espera el frontend
    const linesOut = lines.map((ln, idx) => {
      const size = normalizeSizeAny(ln.size);
      const opts = flatOptions
        .filter(o => o.size === size)
        .map((o, j) => ({
          quoteItemId: `${idx}-${j}`,
          tierLabel: o.provider,
          brand: o.brand,
          model: o.model,
          loadSpeed: o.loadSpeed,
          stock: o.stock,
          quotedQty: o.quotedQty,
          priceEach: o.priceEach,
          totalTires: o.totalTires,
          included: true,
        }));

      return {
        lineId: String(idx),
        size: ln.size,
        requestedQty: ln.qty,
        vehicleMake: ln.vehicleMake ?? null,
        vehicleModel: ln.vehicleModel ?? null,
        vehicleYear: ln.vehicleYear ?? null,
        options: opts,
      };
    });

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
