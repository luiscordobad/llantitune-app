
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

type Tier = "Económica" | "Media" | "Premium";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let lines: any[] = [];
    if (Array.isArray(body?.lines)) {
      lines = body.lines;
    } else if (Array.isArray(body?.draft?.vehicles)) {
      lines = body.draft.vehicles.flatMap((v: any) => v.lines ?? []);
    }

    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "No lines provided" }, { status: 400 });
    }

    const requestedLines = lines
      .map((l: any) => ({
        size: normalizeSizeAny(l.size),
        rawSize: l.size,
        qty: Number(l.qty ?? 0),
        vehicleMake: l.vehicleMake ?? null,
        vehicleModel: l.vehicleModel ?? null,
        vehicleYear: l.vehicleYear ?? null,
      }))
      .filter(l => l.qty > 0);

    const minStock = Number(body?.minStock ?? 1);
    const markupPct = Number(body?.markup ?? 30) / 100;

    const { data: offersAll } = await supabaseAdmin
      .from("offers")
      .select("provider,tire_id,brand,model,load_speed,size,stock,cost,snapshot_date")
      .neq("provider", null);

    const linesOut: any[] = [];

    for (let lineIdx = 0; lineIdx < requestedLines.length; lineIdx++) {
      const ln = requestedLines[lineIdx];

      const relevant = (offersAll ?? [])
        .filter(o => normalizeSizeAny(o.size) === ln.size)
        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime());

      const byTire = new Map<string, any>();

      for (const o of relevant) {
        const stock = Number(o.stock ?? 0);
        if (stock < ln.qty) continue;
        if (stock < minStock) continue;
        if (o.cost == null) continue;

        const priceEach = Math.round(Number(o.cost) * (1 + markupPct));
        const existing = byTire.get(o.tire_id);

        if (!existing || priceEach < existing.priceEach) {
          byTire.set(o.tire_id, {
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

      const prices = opts.map(o => o.priceEach).sort((a, b) => a - b);
      const p33 = prices[Math.floor(prices.length * 0.33)] ?? 0;
      const p66 = prices[Math.floor(prices.length * 0.66)] ?? 0;

      const tierOrder: Record<Tier, number> = {
        "Económica": 1,
        "Media": 2,
        "Premium": 3,
      };

      const options = opts.map((o, j) => {
        let tier: Tier = "Media";
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

      options.sort((a, b) =>
        tierOrder[a.tierLabel as Tier] - tierOrder[b.tierLabel as Tier] ||
        a.priceEach - b.priceEach
      );

      linesOut.push({
        lineId: String(lineIdx),
        size: ln.rawSize,
        requestedQty: ln.qty,
        vehicleMake: ln.vehicleMake,
        vehicleModel: ln.vehicleModel,
        vehicleYear: ln.vehicleYear,
        options,
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
