import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

/* -------------------- helpers -------------------- */
function cleanPhone(v: any) {
  return (v ?? "").toString().replace(/\D/g, "");
}
function lower(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}
function toIntOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function money(n: any) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}
/* ------------------------------------------------- */

type SettingsDefaults = {
  default_markup_pct?: number | null;
  default_install_each?: number | null;
  default_extras_each?: number | null;
  default_min_stock?: number | null;
};

async function getSettingsDefaults(): Promise<SettingsDefaults> {
  // If your table/fields differ, adjust select(...) accordingly.
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("default_markup_pct, default_install_each, default_extras_each, default_min_stock")
    .single();

  if (error) return {};
  // Supabase types are often `any` unless you generated types; cast safely:
  return (data ?? {}) as SettingsDefaults;
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json();

    const defaults = await getSettingsDefaults();

    // Internals
    const markup = Number(body.markup ?? defaults?.default_markup_pct ?? 30);
    const install = Number(body.install ?? defaults?.default_install_each ?? 0); // per car
    const extras = Number(body.extras ?? defaults?.default_extras_each ?? 0);   // per car
    const minStock = Number(body.minStock ?? defaults?.default_min_stock ?? 0);

    // Customer
    const customerName = body.customerName ?? null;
    const customerPhone = cleanPhone(body.customerPhone ?? "") || null;
    const customerEmail = lower(body.customerEmail ?? "") || null;

    const depositAmount = body.depositAmount ?? null;
    const promisedAt = body.promisedAt ?? null;
    const internalNotes = body.internalNotes ?? null;

    // vehicles[]
    const vehicles = Array.isArray(body.vehicles)
      ? body.vehicles.map((v: any) => ({
          make: v?.make ?? v?.vehicleMake ?? null,
          model: v?.model ?? v?.vehicleModel ?? null,
          year: toIntOrNull(v?.year ?? v?.vehicleYear ?? null),
        }))
      : [];

    if (!vehicles.length) {
      return NextResponse.json({ error: "vehicles[] is required" }, { status: 400 });
    }

    // lines[]
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) {
      return NextResponse.json({ error: "lines[] is required" }, { status: 400 });
    }

    // CRITICAL: don't drop vehicle fields
    const lines = linesIn
      .map((l: any, i: number) => {
        const size = normalizeSizeAny(l.size);
        const qty = Math.max(1, Number(l.qty ?? 1));

        const viNum = Number(l.vehicleIndex ?? l.vehicle_index);
        const vehicleIndex = Number.isFinite(viNum) ? Math.trunc(viNum) : null;

        const v = vehicleIndex !== null ? vehicles[vehicleIndex] : null;

        return {
          line_no: i + 1,
          size,
          quantity: qty,
          vehicle_index: vehicleIndex,
          vehicle_make: l.vehicleMake ?? l.vehicle_make ?? v?.make ?? null,
          vehicle_model: l.vehicleModel ?? l.vehicle_model ?? v?.model ?? null,
          vehicle_year: toIntOrNull(l.vehicleYear ?? l.vehicle_year ?? v?.year ?? null),
        };
      })
      .filter((x: any) => !!x.size);

    if (!lines.length) {
      return NextResponse.json({ error: "Invalid sizes" }, { status: 400 });
    }

    // Customer insert (simple). If you already have upsert, keep yours.
    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .insert({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      })
      .select("customer_id")
      .single();
    if (cErr) throw cErr;

    // Quote DRAFT (no folio yet)
    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_id: customer.customer_id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,

        markup_pct: markup,
        install_each: install,
        extras_each: extras,
        min_stock: minStock,

        deposit_amount: depositAmount,
        promised_at: promisedAt,
        internal_notes: internalNotes,

        status: "DRAFT",
      })
      .select("quote_id, quote_no, created_at")
      .single();
    if (qErr) throw qErr;

    const quoteId = q.quote_id as string;
    const quoteNo = q.quote_no ?? null;
    const quoteNumber = quoteNo ? `LT-${quoteNo}` : "BORRADOR (sin folio)";

    // Insert quote_lines (vehicle_* FIX)
    const { data: insertedLines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .insert(
        lines.map((l: any) => ({
          quote_id: quoteId,
          line_no: l.line_no,
          size: l.size,
          quantity: l.quantity,
          vehicle_index: l.vehicle_index,
          vehicle_make: l.vehicle_make,
          vehicle_model: l.vehicle_model,
          vehicle_year: l.vehicle_year,
        }))
      )
      .select("line_id, line_no, size, quantity, vehicle_index, vehicle_make, vehicle_model, vehicle_year");
    if (lErr) throw lErr;

    // Providers latest snapshot (offers table)
    const providers = ["Prodynamics", "Cotizador", "INV"];
    const latest: Record<string, string | null> = {};
    for (const p of providers) {
      const { data } = await supabaseAdmin
        .from("offers")
        .select("snapshot_date")
        .eq("provider", p)
        .order("snapshot_date", { ascending: false })
        .limit(1);
      latest[p] = data?.[0]?.snapshot_date ?? null;
    }

    // Build options per line (for UI)
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

      all.sort((a, b) => money(a.cost) - money(b.cost));

      const options = all.slice(0, 60).map((x: any, idx: number) => {
        const stock = Number(x.stock ?? 0);
        const quotedQty = Math.max(0, Math.min(requestedQty, stock || 0));
        const cost = money(x.cost);
        const priceEach = Math.round(cost * (1 + markup / 100));
        const totalTires = priceEach * quotedQty;

        return {
          rank: idx + 1,
          provider: x.provider,
          sku: x.sku,
          tireId: x.tire_id ?? null,
          brand: x.brand,
          model: x.model,
          loadSpeed: x.load_speed,
          size: x.size,
          stock,
          requestedQty,
          quotedQty,
          cost,
          priceEach,
          totalTires,
          included: true,
        };
      });

      if (options.length) hasAnyOptions = true;

      perLineResults.push({
        lineId: line.line_id,
        lineNo: line.line_no,
        size,
        requestedQty,

        vehicleIndex: line.vehicle_index,
        vehicleMake: line.vehicle_make,
        vehicleModel: line.vehicle_model,
        vehicleYear: line.vehicle_year,

        options,
      });
    }

    // ===== Services per car + FINAL total to send =====
    const vehicleSet = new Set<number>();
    (insertedLines ?? []).forEach((l: any) => {
      const vi = Number(l.vehicle_index);
      if (Number.isFinite(vi)) vehicleSet.add(vi);
    });
    const numVehicles = Math.max(1, vehicleSet.size || vehicles.length || 0);
    const serviceTotal = (install + extras) * numVehicles;

    // Tires total estimate = first option per line
    const tiresTotalEstimate = (perLineResults ?? []).reduce((sum: number, ln: any) => {
      const first = ln?.options?.[0];
      return sum + money(first?.totalTires);
    }, 0);

    const grandTotal = tiresTotalEstimate + serviceTotal;

    // ===== Message (now includes services in the total) =====
    const linesText = (perLineResults ?? [])
      .map((ln: any) => {
        const veh = [ln.vehicleMake, ln.vehicleModel, ln.vehicleYear].filter(Boolean).join(" ");
        const first = ln?.options?.[0];
        if (!first) return `🚗 ${veh}\nMedida ${ln.size} (${ln.requestedQty}) — Sin disponibilidad`;

        return `🚗 ${veh}
Medida ${ln.size} (${ln.requestedQty})
${first.brand} ${first.model} — $${first.priceEach} c/u`;
      })
      .join("\n\n");

    const whatsappText = `Hola${customerName ? " " + customerName : ""} 👋

Te comparto tu cotización:

${linesText}

Total final: $${grandTotal.toFixed(2)}

¿Con cuál opción te quedas para apartarla?
`;

    const emailSubject = `Cotización Llantitune - ${quoteNumber}`;
    const emailBody = whatsappText;

    return NextResponse.json({
      ok: true,
      quoteId,
      quoteNo,
      quoteNumber,
      createdAt: q.created_at,
      providersLatestSnapshot: latest,
      hasAnyOptions,

      vehicles,
      lines: perLineResults,

      whatsappText,
      emailSubject,
      emailBody,

      internal: {
        markup,
        install,
        extras,
        minStock,
        numVehicles,
        serviceTotal,
        tiresTotalEstimate,
        grandTotal,
      },
    });
  } catch (e: any) {
    console.error("API /quote ERROR:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
