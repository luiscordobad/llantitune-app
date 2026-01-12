
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lines, providers, minStock = 1, markup = 1.3 } = body;

    const options: any[] = [];

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

        if (error) {
          console.error(error);
          continue;
        }

        const latestByTire = new Map<string, any>();
        for (const row of data ?? []) {
          if (!latestByTire.has(row.tire_id)) {
            latestByTire.set(row.tire_id, row);
          }
        }

        for (const offer of latestByTire.values()) {
          const stock = Number(offer.stock ?? 0);
          if (stock <= 0) continue;

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
            price: Math.round(offer.cost * markup),
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
