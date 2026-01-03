import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

type LineIn = { size: string; qty: number };

function digitsOnly(s: string) { return (s ?? "").replace(/\D/g, ""); }
function lower(s: string) { return (s ?? "").trim().toLowerCase(); }
function fmtQuoteNumber(quoteNo: number, createdAt?: string) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `LT-${y}${m}${dd}-${String(quoteNo).padStart(5, "0")}`;
}

async function getSettingsDefaults() {
  const { data, error } = await supabaseAdmin.from("settings").select("key, value_numeric");
  if (error) throw error;
  const map: any = {};
  for (const r of data ?? []) map[r.key] = Number(r.value_numeric ?? 0);
  return map;
}

async function findOrCreateCustomer(name?: string, phone?: string, email?: string) {
  const p = digitsOnly(phone ?? "");
  const e = lower(email ?? "");
  const n = (name ?? "").trim() || null;

  if (p) {
    const { data, error } = await supabaseAdmin.from("customers").select("*").eq("phone", p).limit(1);
    if (error) throw error;
    if (data?.[0]) return data[0].customer_id as string;
  }
  if (e) {
    const { data, error } = await supabaseAdmin.from("customers").select("*").eq("email", e).limit(1);
    if (error) throw error;
    if (data?.[0]) return data[0].customer_id as string;
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

function pickBuckets(options: any[]) {
  if (!options.length) return [];
  const econ = options[0];
  const prem = options[options.length - 1];
  const mid = options[Math.floor(options.length / 2)];
  // de-dup by quote_item_id
  const seen = new Set<string>();
  const out: any[] = [];
  for (const o of [econ, mid, prem]) {
    const id = String(o.quoteItemId ?? o.quote_item_id ?? "");
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(o);
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const defaults = await getSettingsDefaults();

    const markup = Number(body.markup ?? defaults.default_markup_pct ?? 30);
    const install = Number(body.install ?? defaults.default_install_each ?? 1000);
    const extras = Number(body.extras ?? defaults.default_extras_each ?? 1000);
    const minStock = Number(body.minStock ?? defaults.default_min_stock ?? 8);

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
    const quoteNumber = fmtQuoteNumber(quoteNo, q.created_at);

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
      const requestedQty = Number(line.quantity);

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

      const options = all.slice(0, 60).map((x: any, idx: number) => {
        const stock = Number(x.stock ?? 0);
        const quotedQty = Math.max(0, Math.min(requestedQty, stock || 0));
        const limited = quotedQty < requestedQty;

        const cost = Number(x.cost ?? 0);
        const priceEach = Math.round(cost * (1 + markup / 100));

        const totalTires = priceEach * quotedQty;
        const totalServices = (install + extras) * quotedQty;
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
          stock,
          requestedQty,
          quotedQty,
          limited,
          cost,
          priceEach,
          totalTires,
          totalWithServices: total
        };
      }).filter(o => o.quotedQty > 0); // never offer 0

      if (options.length) hasAnyOptions = true;

      // Persist quote_items (top 30 per line)
      if (options.length) {
        const items = options.slice(0, 30).map((o: any) => ({
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
        const { data: inserted, error: iErr } = await supabaseAdmin.from("quote_items").insert(items).select("quote_item_id, line_id, rank");
        if (iErr) throw iErr;

        // attach quoteItemId back for UI bucket selection (match by rank)
        const mapByRank: Record<number, string> = {};
        for (const it of inserted ?? []) mapByRank[Number(it.rank)] = it.quote_item_id as string;
        for (const o of options as any[]) (o as any).quoteItemId = mapByRank[(o as any).rank] ?? null;
      }

      // Build buckets for customer message
      const buckets = pickBuckets(options.slice(0, 12));
      const bucketLabeled = buckets.map((o: any, i: number) => ({
        ...o,
        label: i === 0 ? "Económica" : (i === 1 && buckets.length === 3 ? "Recomendada" : (i === 1 ? "Premium" : "Premium"))
      }));

      // Warning if some options limited
      const anyLimited = bucketLabeled.some(o => o.limited);

      perLineResults.push({
        lineId: line.line_id,
        lineNo: line.line_no,
        size,
        requestedQty,
        options: bucketLabeled,
        anyLimited
      });
    }

    const header =
`Llantitune ✅ Cotización
No. ${quoteNumber}
${customerName ? `Cliente: ${customerName}\n` : ""}${vehicle ? `Vehículo: ${vehicle}\n` : ""}
`;

    const bodyText = perLineResults.map((lr: any) => {
      const opts = (lr.options ?? []);
      if (!opts.length) return `• ${lr.size} (solicitado x${lr.requestedQty}): Sin opciones con stock suficiente`;

      const lines = opts.map((o: any) => {
        const qtyText = o.limited ? ` (Disponible x${o.quotedQty})` : "";
        return `  ${o.label}: ${o.brand} | ${o.loadSpeed ?? ""} | $${o.priceEach} c/u | Total: $${o.totalWithServices}${qtyText}`;
      });

      const note = opts.some((o: any) => o.limited)
        ? `  ⚠️ Nota: La(s) opción(es) marcada(s) solo tienen stock para esa cantidad hoy.`
        : "";

      return `• ${lr.size} (solicitado x${lr.requestedQty}):\n${lines.join("\n")}${note ? "\n" + note : ""}`;
    }).join("\n\n");

    const whatsappText = header + "\n" + bodyText + "\n\n¿Te aparto alguna opción?";

    const emailSubject = `Cotización Llantitune – ${quoteNumber}`;
    const emailBody =
`Hola${customerName ? " " + customerName : ""},

Te comparto la cotización No. ${quoteNumber}.
${vehicle ? `Vehículo: ${vehicle}\n` : ""}

${perLineResults.map((lr: any) => {
  const opts = lr.options ?? [];
  if (!opts.length) return `- ${lr.size} (solicitado x${lr.requestedQty}): Sin stock suficiente`;

  const anyLimited = opts.some((o: any) => o.limited);
  const bullets = opts.map((o: any) => {
    const qtyText = o.limited ? ` (Disponible x${o.quotedQty})` : "";
    return `  • ${o.label}: ${o.brand} ${o.loadSpeed ?? ""} – $${o.priceEach} c/u (Total: $${o.totalWithServices})${qtyText}`;
  }).join("\n");

  const note = anyLimited ? `\n  ⚠️ Nota: Algunas opciones tienen stock limitado hoy.` : "";
  return `- ${lr.size} (solicitado x${lr.requestedQty}):\n${bullets}${note}`;
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
      emailBody,
      internal: { markup, install, extras, minStock }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
