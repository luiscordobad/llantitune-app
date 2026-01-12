import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-4);
  return `LT-${y}${m}${day}-${t}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, quoteId, draft: draftFromBody } = body;

    if (status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "Only SENT status is supported" },
        { status: 400 }
      );
    }

    let draft = draftFromBody;

    if (!draft && quoteId) {
      const { data, error } = await supabaseAdmin
        .from("quote_drafts")
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          lines:quote_draft_lines (
            id,
            size,
            requested_qty,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            options:quote_draft_items (
              tier_label,
              brand,
              model,
              provider,
              price_each,
              quoted_qty,
              total_tires,
              included
            )
          )
        `)
        .eq("id", quoteId)
        .single();

      if (error) {
        console.error("DRAFT LOAD ERROR:", error);
      }

      draft = data;
    }

    if (!draft || !Array.isArray(draft.lines) || !draft.lines.length) {
      return NextResponse.json(
        { ok: false, error: "Draft with lines is required" },
        { status: 400 }
      );
    }

    const quoteNumber = generateQuoteNumber();

    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        quote_number: quoteNumber,
        status: "SENT",
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        customer_email: draft.customer_email,
        grand_total: 0,
      })
      .select()
      .single();

    if (quoteErr || !quote) {
      throw quoteErr || new Error("Failed to insert quote");
    }

    let grandTotal = 0;

    for (const ln of draft.lines) {
      const vehicleLabel = [
        ln.vehicle_make,
        ln.vehicle_model,
        ln.vehicle_year,
      ]
        .filter(Boolean)
        .join(" ");

      const { data: line, error: lineErr } = await supabaseAdmin
        .from("quote_lines")
        .insert({
          quote_id: quote.id,
          size: ln.size,
          requested_qty: ln.requested_qty,
          vehicle: vehicleLabel || null,
        })
        .select()
        .single();

      if (lineErr || !line) {
        throw lineErr || new Error("Failed to insert quote line");
      }

      const includedOptions = (ln.options ?? []).filter(
        (o: any) => o.included !== false
      );

      if (!includedOptions.length) {
        throw new Error("Each line must have at least one included option");
      }

      for (const o of includedOptions) {
        const total = Number(o.total_tires ?? 0);
        grandTotal += total;

        const { error: itemErr } = await supabaseAdmin
          .from("quote_items")
          .insert({
            quote_id: quote.id,
            quote_line_id: line.id,
            tier: o.tier_label,
            brand: o.brand,
            model: o.model,
            provider: o.provider ?? "N/A",
            price_each: o.price_each,
            qty: o.quoted_qty,
            total,
          });

        if (itemErr) throw itemErr;
      }
    }

    await supabaseAdmin
      .from("quotes")
      .update({ grand_total: grandTotal })
      .eq("id", quote.id);

    if (quoteId) {
      await supabaseAdmin
        .from("quote_drafts")
        .update({ status: "SENT" })
        .eq("id", quoteId);
    }

    return NextResponse.json({
      ok: true,
      quoteNumber,
    });
  } catch (err: any) {
    console.error("QUOTE STATUS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
