import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-4);
  return `LT-${y}${m}${day}-${t}`;
}

function asNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, quoteId, draft: draftFromBody } = body ?? {};

    if (status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "Only SENT status is supported" },
        { status: 400 }
      );
    }

    if (!draftFromBody) {
      return NextResponse.json(
        { ok: false, error: "Draft data is required in request body" },
        { status: 400 }
      );
    }

    const draft = draftFromBody as any;

    // Prefer explicit quoteId (top-level) then draft.quoteId; if missing, create one.
    const finalQuoteId: string =
      (quoteId as string) || (draft.quoteId as string) ||
      (globalThis.crypto?.randomUUID?.() ?? "");

    if (!finalQuoteId) {
      return NextResponse.json(
        { ok: false, error: "quoteId is required (could not be generated)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one line is required" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 1) Ensure quote header exists (create if missing)
    // -------------------------------------------------------
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, quote_number")
      .eq("quote_id", finalQuoteId)
      .maybeSingle();

    if (exErr) throw exErr;

    let quoteNumber: string =
      (draft.quoteNumber as string) || existing?.quote_number || "";

    if (!quoteNumber || quoteNumber === "BORRADOR") {
      quoteNumber = generateQuoteNumber();
    }

    // Create quote row if it doesn't exist; otherwise update header basics.
    if (!existing) {
      const { error: insErr } = await supabaseAdmin.from("quotes").insert({
        quote_id: finalQuoteId,
        quote_number: quoteNumber,
        status: "SENT",
        customer_name: draft.customer_name ?? draft.customerName ?? null,
        customer_phone: draft.customer_phone ?? draft.customerPhone ?? null,
        customer_email: draft.customer_email ?? draft.customerEmail ?? null,
        vehicle_text: draft.vehicle_text ?? null,
        grand_total: 0,
      });
      if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabaseAdmin
        .from("quotes")
        .update({
          status: "SENT",
          quote_number: quoteNumber,
          customer_name: draft.customer_name ?? draft.customerName ?? null,
          customer_phone: draft.customer_phone ?? draft.customerPhone ?? null,
          customer_email: draft.customer_email ?? draft.customerEmail ?? null,
          vehicle_text: draft.vehicle_text ?? null,
        })
        .eq("quote_id", finalQuoteId);
      if (updErr) throw updErr;
    }

    // -------------------------------------------------------
    // 2) Replace lines/items for this quote
    // -------------------------------------------------------
    await supabaseAdmin.from("quote_items").delete().eq("quote_id", finalQuoteId);
    await supabaseAdmin.from("quote_lines").delete().eq("quote_id", finalQuoteId);

    let grandTotal = 0;

    for (let i = 0; i < draft.lines.length; i++) {
      const ln = draft.lines[i];

      const lineId: string =
        (ln.lineId as string) || (globalThis.crypto?.randomUUID?.() ?? "");
      if (!lineId) {
        throw new Error("Failed to generate lineId");
      }

      const size = ln.size;
      const quantity = asNumber(ln.requestedQty ?? ln.requested_qty ?? ln.qty ?? 1, 1);
      const vehicleText = ln.vehicle ?? ln.vehicleText ?? null;

      const { error: lineErr } = await supabaseAdmin.from("quote_lines").insert({
        quote_id: finalQuoteId,
        line_id: lineId,
        line_no: i + 1,
        size,
        quantity,
        vehicle_text: vehicleText,
      });
      if (lineErr) throw lineErr;

      const options = Array.isArray(ln.options) ? ln.options : [];
      const included = options.filter((o: any) => o?.included !== false);

      for (const o of included) {
        const quoteItemId: string =
          (o.quoteItemId as string) || (globalThis.crypto?.randomUUID?.() ?? "");
        if (!quoteItemId) throw new Error("Failed to generate quoteItemId");

        const qty = asNumber(o.qty ?? o.quotedQty ?? quantity, quantity);
        const priceEach = asNumber(o.price_each ?? o.priceEach ?? 0, 0);
        const total = asNumber(o.total ?? o.totalTires ?? priceEach * qty, priceEach * qty);

        grandTotal += total;

        const { error: itemErr } = await supabaseAdmin.from("quote_items").insert({
          quote_id: finalQuoteId,
          line_id: lineId,
          quote_item_id: quoteItemId,

          tier: o.tier ?? null,
          provider: o.provider ?? "N/A",
          sku: o.sku ?? null,
          size: o.size ?? size ?? null,
          brand: o.brand ?? null,
          model: o.model ?? null,
          load_speed: o.loadSpeed ?? o.load_speed ?? null,

          stock: asNumber(o.stock ?? 0, 0),
          cost: asNumber(o.cost ?? o.cost_each ?? 0, 0),
          price_each: priceEach,

          qty,
          total,
        });
        if (itemErr) throw itemErr;
      }
    }

    // -------------------------------------------------------
    // 3) Update totals
    // -------------------------------------------------------
    const { error: totErr } = await supabaseAdmin
      .from("quotes")
      .update({ grand_total: grandTotal })
      .eq("quote_id", finalQuoteId);
    if (totErr) throw totErr;

    return NextResponse.json({
      ok: true,
      quoteId: finalQuoteId,
      quoteNumber,
      grandTotal,
    });
  } catch (err: any) {
    console.error("QUOTE STATUS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
