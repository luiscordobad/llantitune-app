import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSizeAny } from "@/lib/normalize";

export const runtime = "nodejs";

/* -------------------- helpers -------------------- */
function digitsOnly(v: any) {
  return (v ?? "").toString().replace(/\D/g, "");
}
function lower(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}
function toIntOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
/* ------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* ===============================
       1) INPUTS BASE
    =============================== */
    const markup = Number(body.markup ?? 30);
    const installEach = Number(body.install ?? 0); // por coche
    const extrasEach = Number(body.extras ?? 0);   // por coche
    const minStock = Number(body.minStock ?? 0);

    /* ===============================
       2) CUSTOMER
    =============================== */
    const customerName = body.customerName ?? null;
    const customerPhone = digitsOnly(body.customerPhone ?? "") || null;
    const customerEmail = lower(body.customerEmail ?? "") || null;

    const { data: cust, error: custErr } = await supabaseAdmin
      .from("customers")
      .insert({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      })
      .select("customer_id")
      .single();

    if (custErr) throw custErr;
    const customerId = cust.customer_id;

    /* ===============================
       3) VEHICLES (OBLIGATORIO)
    =============================== */
    const vehicles = Array.isArray(body.vehicles)
      ? body.vehicles.map((v: any) => ({
          make: v.make ?? null,
          model: v.model ?? null,
          year: toIntOrNull(v.year),
        }))
      : [];

    if (!vehicles.length) {
      return NextResponse.json(
        { error: "vehicles[] is required" },
        { status: 400 }
      );
    }

    /* ===============================
       4) LINES (NO PERDER VEHÍCULO)
    =============================== */
    const linesRaw = Array.isArray(body.lines) ? body.lines : [];
    if (!linesRaw.length) {
      return NextResponse.json(
        { error: "lines[] is required" },
        { status: 400 }
      );
    }

    const lines = linesRaw.map((l: any, i: number) => {
      const vehicleIndex = Number(l.vehicleIndex);
      const v =
        Number.isFinite(vehicleIndex) && vehicles[vehicleIndex]
          ? vehicles[vehicleIndex]
          : null;

      return {
        line_no: i + 1,
        size: normalizeSizeAny(l.size),
        quantity: Math.max(1, Number(l.qty ?? 1)),

        vehicle_index: Number.isFinite(vehicleIndex) ? vehicleIndex : null,
        vehicle_make: l.vehicleMake ?? v?.make ?? null,
        vehicle_model: l.vehicleModel ?? v?.model ?? null,
        vehicle_year: toIntOrNull(l.vehicleYear ?? v?.year ?? null),
      };
    });

    /* ===============================
       5) CREATE QUOTE (DRAFT)
    =============================== */
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,

        markup_pct: markup,
        install_each: installEach,
        extras_each: extrasEach,
        min_stock: minStock,

        status: "DRAFT",
      })
      .select("quote_id, created_at")
      .single();

    if (qErr) throw qErr;
    const quoteId = quote.quote_id;

    /* ===============================
       6) INSERT QUOTE_LINES  (FIX CLAVE)
    =============================== */
    const lineRows = lines.map((l) => ({
      quote_id: quoteId,
      line_no: l.line_no,
      size: l.size,
      quantity: l.quantity,
      vehicle_index: l.vehicle_index,
      vehicle_make: l.vehicle_make,
      vehicle_model: l.vehicle_model,
      vehicle_year: l.vehicle_year,
    }));

    const { data: insertedLines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .insert(lineRows)
      .select(
        "line_id, line_no, size, quantity, vehicle_index, vehicle_make, vehicle_model, vehicle_year"
      );

    if (lErr) throw lErr;

    /* ===============================
       7) CALC SERVICIOS POR COCHE
    =============================== */
    const vehicleSet = new Set<number>();
    insertedLines?.forEach((l: any) => {
      if (Number.isFinite(l.vehicle_index)) {
        vehicleSet.add(l.vehicle_index);
      }
    });

    const numVehicles = Math.max(vehicleSet.size, vehicles.length, 1);
    const serviceTotal = (installEach + extrasEach) * numVehicles;

    /* ===============================
       8) RESPONSE
    =============================== */
    return NextResponse.json({
      ok: true,
      quoteId,
      status: "DRAFT",

      vehicles,
      lines: insertedLines,

      internal: {
        markup,
        installEach,
        extrasEach,
        numVehicles,
        serviceTotal,
      },
    });
  } catch (err: any) {
    console.error("API /quote ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
