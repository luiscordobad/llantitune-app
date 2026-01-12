import { NextResponse } from "next/serverBR import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const { quoteId, status, draft } = body;

    if (status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "Only SENT status is supported" },
        { status: 400 }
      );
    }

    if (!draft || !Array.isArray(draft.lines)) {
      return NextResponse.json(
        { ok: false, error: "Draft with lines is required" },
        { status: 400 }
      );
    }

    const quoteNumber = generateQuoteNumber();

    // =========================
    // 1️⃣ Insert quote
    // =========================
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        quote_number: quoteNumber,
        status: "SENT",
        customer_name: draft.customerName,
        customer_phone: draft.customerPhone,
        customer_email: draft.customerEmail,
        grand_total: null,
      })
      .select()
      .single();

    if (quoteErr || !quote) {
      throw quoteErr || new Error("Failed to insert quote");
    }

    let grandTotal = 0;

    // =========================
    // 2️⃣ Insert lines + items
    // =========================
    for (const ln of draft.lines) {
      const vehicleLabel = [
        ln.vehicleMake,
        ln.vehicleModel,
        ln.vehicleYear,
      ]
        .filter(Boolean)
        .join(" ");

      const { data: line, error: lineErr } = await supabaseAdmin
        .from("quote_lines")
        .insert({
          quote_id: quote.id,
          size: ln.size,
          requested_qty: ln.requestedQty,
          vehicle: vehicleLabel || null,
        })
        .select()
        .single();

      if (lineErr || !line) {
        throw lineErr || new Error("Failed to insert quote_line");
      }

      const includedOptions = (ln.options ?? []).filter(
        (o: any) => o.included !== false
      );

      for (const o of includedOptions) {
        const total = Number(o.totalTires ?? 0);
        grandTotal += total;

        const { error: itemErr } = await supabaseAdmin
          .from("quote_items")
          .insert({
            quote_id: quote.id,
            quote_line_id: line.line_id,
            tier: o.tierLabel,
            brand: o.brand,
            model: o.model,
            provider: o.provider ?? "N/A",
            price_each: o.priceEach,
            qty: o.quotedQty,
            total,
          });

        if (itemErr) {
          throw itemErr;
        }
      }
    }

    // =========================
    // 3️⃣ Update grand total
    // =========================
    await supabaseAdmin
      .from("quotes")
      .update({ grand_total: grandTotal })
      .eq("id", quote.id);

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
