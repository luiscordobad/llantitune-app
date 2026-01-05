import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

type VehicleIn = { make?: string | null; model?: string | null; year?: any };
type LineIn = {
  size: string;
  qty: number;

  vehicleIndex?: any; // number
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: any; // number|string
};

function digitsOnly(s: string) {
  return (s ?? "").replace(/\D/g, "");
}
function lower(s: string) {
  return (s ?? "").trim().toLowerCase();
}
function toIntOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// ---- Si ya tienes estas funciones en tu archivo, déjalas como estén y elimina duplicados ----
async function getDefaults() {
  // Ajusta según tu tabla/estructura real de settings
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("default_markup_pct, default_install_each, default_extras_each, default_min_stock")
    .single();
  if (error) return {};
  return data ?? {};
}

async function findOrCreateCustomer(name?: string, phone?: string, email?: string) {
  // Ajusta a tu lógica real si ya existe.
  // Aquí un ejemplo simple:
  const cleanPhone = phone ? digitsOnly(phone) : null;
  const cleanEmail = email ? lower(email) : null;

  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("customer_id")
    .eq("phone", cleanPhone)
    .limit(1);

  if (existing?.[0]?.customer_id) return existing[0].customer_id as string;

  const { data: created, error } = await supabaseAdmin
    .from("customers")
    .insert({
      name: name ?? null,
      phone: cleanPhone ?? null,
      email: cleanEmail ?? null,
    })
    .select("customer_id")
    .single();

  if (error) throw error;
  return created.customer_id as string;
}
// -------------------------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- inputs base ---
    const defaults: any = await getDefaults();

    const markup = Number(body.markup ?? defaults.default_markup_pct ?? 30);
    const install = Number(body.install ?? defaults.default_install_each ?? 1000); // por coche
    const extras = Number(body.extras ?? defaults.default_extras_each ?? 1000);   // por coche
    const minStock = Number(body.minStock ?? defaults.default_min_stock ?? 8);

    const customerName = body.customerName ?? null;
    const customerPhone = digitsOnly(body.customerPhone ?? "") || null;
    const customerEmail = lower(body.customerEmail ?? "") || null;

    const depositAmount = body.depositAmount ?? null;
    const promisedAt = body.promisedAt ?? null;
    const internalNotes = body.internalNotes ?? null;

    // --- vehicles[] (para múltiples coches) ---
    const vehiclesIn: VehicleIn[] = Array.isArray(body.vehicles) ? body.vehicles : [];
    const vehicles = vehiclesIn.map((v) => ({
      make: (v.make ?? null) as string | null,
      model: (v.model ?? null) as string | null,
      year: toIntOrNull(v.year),
    }));

    // --- lines[] (NO eliminar vehicle fields) ---
    const linesIn: LineIn[] = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) return NextResponse.json({ error: "Missing lines" }, { status: 400 });

    const lines = linesIn
      .map((l) => {
        const size = normalizeSizeAny(l.size);
        const qty = Math.max(1, Number(l.qty ?? 1));
        const vehicleIndex = (() => {
          const n = Number(l.vehicleIndex);
          return Number.isFinite(n) ? Math.trunc(n) : null;
        })();

        return {
          size,
          qty,
          vehicleIndex,
          vehicleMake: l.vehicleMake ?? null,
          vehicleModel: l.vehicleModel ?? null,
          vehicleYear: toIntOrNull(l.vehicleYear),
        };
      })
      .filter((l) => !!l.size);

    if (!lines.length) return NextResponse.json({ error: "Invalid sizes" }, { status: 400 });

    // --- customer ---
    const customerId = await findOrCreateCustomer(customerName ?? undefined, customerPhone ?? undefined, customerEmail ?? undefined);

    // --- latest snapshot per provider ---
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

    // --- Create quote header (draft, sin folio) ---
    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,

        // header legacy: opcional
        vehicle_text: null,
        vehicle_make: null,
        vehicle_model: null,
        vehicle_year: null,

        markup_pct: markup,
        install_each: install, // (por coche)
        extras_each: extras,   // (por coche)
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

    // --- Insert quote_lines (AQUÍ ESTABA EL BUG: ya insertamos vehicle_*) ---
    const lineRows = lines.map((l, i) => {
      const vi = l.vehicleIndex;
      const v = vi !== null ? vehicles[vi] : null;

      const vehicle_make = l.vehicleMake ?? v?.make ?? null;
      const vehicle_model = l.vehicleModel ?? v?.model ?? null;
      const vehicle_year = l.vehicleYear ?? v?.year ?? null;

      return {
        quote_id: quoteId,
        line_no: i + 1,
        size: l.size,
        quantity: l.qty,

        vehicle_index: vi,
        vehicle_make,
        vehicle_model,
        vehicle_year,
      };
    });

    const { data: insertedLines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .insert(lineRows)
      .select("line_id, line_no, size, quantity, vehicle_index, vehicle_make, vehicle_model, vehicle_year");

    if (lErr) throw lErr;

    // --- Build options per line (tus llantas disponibles) ---
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

      // ordenar por costo asc para una lista útil
      all.sort((a, b) => Number(a.cost ?? 0) - Number(b.cost ?? 0));

      const options = all.slice(0, 60).map((x: any, idx: number) => {
        const stock = Number(x.stock ?? 0);
        const quotedQty = Math.max(0, Math.min(requestedQty, stock || 0));
        const cost = Number(x.cost ?? 0);

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
          cost,
          priceEach,
          quotedQty,
          totalTires,

          included: true, // por defecto incluidas (puedes cambiar desde UI)
          quoteItemId: null, // si tú ya creas quote_items, aquí lo conectas
        };
      });

      if (options.length) hasAnyOptions = true;

      perLineResults.push({
        lineId: line.line_id,
        lineNo: line.line_no,
        size,
        qty: requestedQty,

        vehicleIndex: line.vehicle_index,
        vehicleMake: line.vehicle_make,
        vehicleModel: line.vehicle_model,
        vehicleYear: line.vehicle_year,

        options,
      });
    }

    // --- Servicios por coche + Total interno (no se muestra al cliente) ---
    const vehicleSet = new Set<number>();
    for (const l of insertedLines ?? []) {
      const vi = Number((l as any).vehicle_index);
      if (Number.isFinite(vi)) vehicleSet.add(vi);
    }
    const numVehicles = Math.max(vehicles.length, vehicleSet.size, 1);

    const serviceTotal = (install + extras) * numVehicles;

    // Estimación simple: toma la primera opción por línea (más barata por nuestro sort)
    const tiresTotalEstimate = perLineResults.reduce((sum, ln) => {
      const first = ln?.options?.[0];
      return sum + Number(first?.totalTires ?? 0);
    }, 0);

    const grandTotalEstimate = tiresTotalEstimate + serviceTotal;

    return NextResponse.json({
      ok: true,
      quoteId,
      status: "DRAFT",
      hasAnyOptions,

      // para UI
      lines: perLineResults,
      vehicles,

      // internos
      markup,
      install,
      extras,
      minStock,
      numVehicles,
      serviceTotal,
      tiresTotalEstimate,
      grandTotalEstimate,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
