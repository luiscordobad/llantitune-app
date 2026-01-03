import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

type LineIn = { size: string; qty: number };

function digitsOnly(s: string) {
  return (s ?? "").replace(/\D/g, "");
}
function lower(s: string) {
  return (s ?? "").trim().toLowerCase();
}
function fmtQuoteNumber(quoteNo: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `LT-${y}${m}${dd}-${String(quoteNo).padStart(5, "0")}`;
}

async function findOrCreateCustomer(name?: string, phone?: string, email?: string) {
  const p = digitsOnly(phone ?? "");
  const e = lower(email ?? "");
  const n = (name ?? "").trim() || null;

  // Try by phone first, then email
  if (p) {
    const { data, error } = await supabaseAdmin.from("customers").select("*").eq("phone", p).limit(1);
    if (error) throw error;
    if (data?.[0]) {
      const existing = data[0];
      // update name/email if missing
      const patch: any = {};
      if (n && !existing.name) patch.name = n;
      if (e && !existing.email) patch.email = e;
      if (Object.keys(patch).length) {
        await supabaseAdmin.from("customers").update(patch).eq("customer_id", existing.customer_id);
      }
      return existing.customer_id as string;
    }
  }

  if (e) {
    const { data, error } = await supabaseAdmin.from("customers").select("*").eq("email", e).limit(1);
    if (error) throw error;
    if (data?.[0]) {
      const existing = data[0];
      const patch: any = {};
      if (n && !existing.name) patch.name = n;
      if (p && !existing.phone) patch.phone = p;
      if (Object.keys(patch).length) {
        await supabaseAdmin.from("customers").update(patch).eq("customer_id", existing.customer_id);
      }
      return existing.customer_id as string;
    }
  }

  if (!n && !p && !e) return null;

  const { data: created, error: cErr } = await supabaseAdmin
    .from("customers")
    .insert({ name: n, phone: p || null, email: e || null })
    .select("customer_id")
    .single();
  if (cErr) throw cErr;

  return created.customer_id as string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const markup = Number(body.markup ?? 30);
    const install = Number(body.install ?? 1000);
    const extras = Number(body.extras ?? 1000);
    const minStock = Number(body.minStock ?? 8);

    const linesIn: LineIn[] = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) return NextResponse.json({ error: "Missing lines" }, { status: 400 });

    const lines = linesIn
      .map(l => ({ size: normalizeSizeAny(l.size), qty: Math.max(1, Number(l.qty ?? 1)) }))
      .filter(l => !!l.size) as { size: string; qty: number }[];

    if (!lines.length) return NextResponse.json({ error: "Invalid sizes" }, { status: 400 });

    const customerName = body.customerName ?? null;
    const customerPhone = digitsOnly(body.customerPhone ?? "") || null;
    const customerEmail = lower(body.customerEmail ?? "") || null;
    const vehicle = body.vehicle ?? null;

    const customerId = await findOrCreateCustomer(customerName ?? undefined, customerPhone ?? undefined, customerEmail ?? undefined);

    // Latest snapshot per provider
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

    // Create quote header
    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        vehicle_text: vehicle,
        size: null,
        quantity: 1,
        urgency: null,
        preference: null,
        markup_pct: markup,
        install_each: install,
        extras_each: extras,
        notes: null
      })
      .select("quote_id, quote_no, created_at")
      .single();
    if (qErr) throw qErr;

    const quoteId = q.quote_id as string;
    const quoteNo = Number(q.quote_no);
    const quoteNumber = fmtQuoteNumber(quoteNo);

    // Insert quote_lines
    const lineRows = lines.map((l, i) => ({
      quote_id: quoteId,
      line_no: i + 1,
      size: l.size,
      quantity: l.qty
    }));

    const { data: insertedLines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .insert(lineRows)
      .select("line_id, line_no, size, quantity");
    if (lErr) throw lErr;

    const perLineResults: any[] = [];
    let hasAnyOptions = false;

    for (const line of insertedLines ?? []) {
      const size = line.size as string;
      const qty = Number(line.quantity);

      const all: any[] = [];
      for (const p of providers) {
        const snap = latest[p];
        if (!snap) continue;

        const { data, error } = await supabaseAdmin
          .from("offers")
          .select("provider, sku, tire_id, brand, model, load_speed, size, stock, cost, snapshot_date")
          .eq("provider", p)
          .eq("snapshot_date", snap)
          .eq("size", size)
          .gte("stock", minStock);

        if (error) throw error;
        all.push(...(data ?? []));
      }

      all.sort((a, b) => Number(a.cost ?? 0) - Number(b.cost ?? 0));

      const options = all.slice(0, 30).map((x: any, idx: number) => {
        const cost = Number(x.cost ?? 0);
        const priceEach = Math.round(cost * (1 + markup / 100));
        const totalTires = priceEach * qty;
        const totalServices = (install + extras) * qty;
        const total = totalTires + totalServices;

        return {
          rank: idx + 1,
          provider: x.provider, // stored, not shown to customer
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

      if (options.length) hasAnyOptions = true;

      if (options.length) {
        const items = options.slice(0, 15).map((o: any) => ({
          quote_id: quoteId,
          line_id: line.line_id,
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

      perLineResults.push({ lineNo: line.line_no, size, qty, options });
    }

    // Customer-facing text WITHOUT provider AND WITHOUT markup/install/extras values
    const header =
`Llantitune ✅ Cotización
No. ${quoteNumber}
${customerName ? `Cliente: ${customerName}\n` : ""}${vehicle ? `Vehículo: ${vehicle}\n` : ""}
`;

    const bodyText = perLineResults.map((lr: any) => {
      const opts = (lr.options ?? []).slice(0, 6);
      if (!opts.length) {
        return `• ${lr.size} (x${lr.qty}): Sin opciones con stock suficiente`;
      }
      const lines = opts.map((o: any) => `  #${o.rank} ${o.brand} | ${o.loadSpeed ?? ""} | $${o.priceEach} c/u | Total: $${o.totalWithServices}`);
      return `• ${lr.size} (x${lr.qty}):\n${lines.join("\n")}`;
    }).join("\n\n");

    const whatsappText = header + "\n" + bodyText + "\n\n¿Te aparto alguna opción?";

    const emailSubject = `Cotización Llantitune – ${quoteNumber}`;
    const emailBody =
`Hola${customerName ? " " + customerName : ""},

Te comparto la cotización No. ${quoteNumber}.
${vehicle ? `Vehículo: ${vehicle}\n` : ""}

${perLineResults.map((lr: any) => {
  const opts = (lr.options ?? []).slice(0, 6);
  if (!opts.length) return `- ${lr.size} (x${lr.qty}): Sin opciones con stock suficiente`;
  return [
    `- ${lr.size} (x${lr.qty}):`,
    ...opts.map((o: any) => `  • ${o.brand} ${o.loadSpeed ?? ""}: $${o.priceEach} c/u (Total: $${o.totalWithServices})`)
  ].join("\n");
}).join("\n\n")}

¿Con cuál opción te quedas para apartarla?

Saludos,
Llantitune`;

    return NextResponse.json({
      quoteId,
      quoteNo,
      quoteNumber,
      createdAt: q.created_at,
      providersLatestSnapshot: latest,
      hasAnyOptions,
      lines: perLineResults,
      whatsappText,
      emailSubject,
      emailBody
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
