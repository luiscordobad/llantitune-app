
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ===============================
    // 1️⃣ OBTENER LINES (FORMATO VIEJO Y NUEVO)
    // ===============================
    let lines: any[] = [];

    if (Array.isArray(body?.lines)) {
      lines = body.lines;
    } else if (Array.isArray(body?.draft?.vehicles)) {
      lines = body.draft.vehicles.flatMap((v: any) => v.lines ?? []);
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No lines provided" },
        { status: 400 }
      );
    }

    // ===============================
    // 2️⃣ OBTENER PROVIDERS (CON FALLBACK)
    // ===============================
    let providers: string[] = [];

    if (Array.isArray(body?.providers) && body.providers.length > 0) {
      providers = body.providers;
    } else {
      const { data } = await supabaseAdmin
        .from("offers")
        .select("provider")
        .neq("provider", null);

      providers = Array.from(new Set((data ?? []).map(p => p.provider)));
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No providers available" },
        { status: 500 }
      );
    }

    // ===============================
    // 3️⃣ PARÁMETROS DE NEGOCIO
    // ===============================
    const minStock = Number(body?.minStock ?? 1);
    const markup = Number(body?.markup ?? 1.3);

    const options: any[] = [];

    // ===============================
    // 4️⃣ BUSCAR LLANTAS
    // ===============================
    for (const line of lines) {
      const normalizedSize = normalizeSizeAny(line.size);
      const requestedQty = Number(line.qty ?? 1);

      for (const provider of providers) {
        const { data, error } = await supabaseAdmin
          .from("offers")
          .select(`
            provider,
            tire_id,
            brand,
            model,
            load_speed,
            size,
            stock,
            cost,
            snapshot_date
          `)
          .eq("provider", provider)
          .eq("size", normalizedSize)
          .order("snapshot_date", { ascending: false });

        if (error || !data) continue;

        const latestByTire = new Map<string, any>();
        for (const row of data) {
          if (!latestByTire.has(row.tire_id)) {
            latestByTire.set(row.tire_id, row);
          }
        }

        for (const offer of latestByTire.values()) {
          const stock = Number(offer.stock ?? 0);
          if (stock < minStock) continue;

          const quotedQty = Math.min(stock, requestedQty);

          options.push({
            tire_id: offer.tire_id,
            provider: offer.provider,
            brand: offer.brand,
            model: offer.model,
            load_speed: offer.load_speed,
            size: offer.size,
            qtyRequested: requestedQty,
            qtyQuoted: quotedQty,
            limited: stock < requestedQty,
            cost: offer.cost,
            price: Math.round(Number(offer.cost) * markup),
            snapshot_date: offer.snapshot_date,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      options,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
