import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const size = normalizeSizeAny(body.size);
    const qty = Number(body.qty ?? 4);
    const markup = Number(body.markup ?? 30);
    const install = Number(body.install ?? 1000);
    const extras = Number(body.extras ?? 1000);
    const minStock = Number(body.minStock ?? 8);

    if (!size) return NextResponse.json({ error: "Invalid size" }, { status: 400 });

    const providers = ["Prodynamics", "Cotizador", "INV"];
    const latest: Record<string, string | null> = {};

    for (const p of providers) {
      const { data, error } = await supabaseAdmin
        .from("offers")
        .select("snapshot_date")
        .eq("provider", p)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;
      latest[p] = data?.[0]?.snapshot_date ?? null;
    }

    const all: any[] = [];
    for (const p of providers) {
      const snap = latest[p];
      if (!snap) continue;

      const { data, error } = await supabaseAdmin
        .from("offers")
        .select("provider, sku, tire_id, brand, model, load_speed, size, stock, cost, description, snapshot_date")
        .eq("provider", p)
        .eq("snapshot_date", snap)
        .eq("size", size)
        .gte("stock", minStock);

      if (error) throw error;
      all.push(...(data ?? []));
    }

    all.sort((a, b) => Number(a.cost ?? 0) - Number(b.cost ?? 0));

    const options = all.slice(0, 50).map((x: any, idx: number) => {
      const cost = Number(x.cost ?? 0);
      const priceEach = Math.round(cost * (1 + markup / 100));
      const totalTires = priceEach * qty;
      const totalServices = (install + extras) * qty;
      const total = totalTires + totalServices;

      return {
        rank: idx + 1,
        provider: x.provider,
        sku: x.sku,
        tireId: x.tire_id,
        brand: x.brand,
        model: x.model,
        loadSpeed: x.load_speed,
        size: x.size,
        stock: x.stock,
        cost,
        priceEach,
        totalTires,
        totalWithServices: total
      };
    });

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_name: body.customerName ?? null,
        customer_phone: body.customerPhone ?? null,
        vehicle_text: body.vehicle ?? null,
        size,
        quantity: qty,
        urgency: null,
        preference: null,
        markup_pct: markup,
        install_each: install,
        extras_each: extras,
        notes: null
      })
      .select("quote_id")
      .single();

    if (qErr) throw qErr;

    const quoteId = q.quote_id as string;

    if (options.length) {
      const items = options.slice(0, 15).map((o: any) => ({
        quote_id: quoteId,
        rank: o.rank,
        provider: o.provider,
        sku: o.sku,
        tire_id: o.tireId,
        brand: o.brand,
        model: o.model,
        load_speed: o.loadSpeed,
        size: o.size,
        stock: o.stock,
        cost: o.cost,
        price_each: o.priceEach,
        total_tires: o.totalTires,
        total_with_services: o.totalWithServices
      }));

      const { error: iErr } = await supabaseAdmin.from("quote_items").insert(items);
      if (iErr) throw iErr;
    }

    const whatsappText =
`Llantitune ✅ Cotización ${size} (x${qty})
${body.customerName ? `Cliente: ${body.customerName}\n` : ""}${body.vehicle ? `Vehículo: ${body.vehicle}\n` : ""}
Markup: ${markup}%
Instalación: $${install} c/u | Extras: $${extras} c/u

Opciones disponibles (stock ≥ ${minStock}):
${options.slice(0, 10).map((o: any) => `#${o.rank} ${o.brand} | ${o.loadSpeed ?? ""} | $${o.priceEach} c/u | Total: $${o.totalWithServices} | Prov: ${o.provider}`).join("\n")}

¿Te aparto alguna opción?`;

    const emailSubject = `Cotización Llantitune – ${size} (x${qty})`;
    const emailBody =
`Hola${body.customerName ? " " + body.customerName : ""},

Te comparto la cotización de llantas ${size} (x${qty}).
${body.vehicle ? `Vehículo: ${body.vehicle}\n` : ""}
Incluye instalación y extras como se indica.

${options.slice(0, 10).map((o: any) => `- ${o.brand} ${o.loadSpeed ?? ""}: $${o.priceEach} c/u (Total: $${o.totalWithServices}) [${o.provider}]`).join("\n")}

¿Con cuál opción te quedas para apartarla?

Saludos,
Llantitune`;

    return NextResponse.json({ quoteId, size, qty, providersLatestSnapshot: latest, options, whatsappText, emailSubject, emailBody });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
