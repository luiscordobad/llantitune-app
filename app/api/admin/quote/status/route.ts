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

    // -------------------------------------------------------
    // 1) EL FRONT NO ENVÍA NADA → draftFromBody es null → ERROR
    // SOLUCIÓN: el frontend debe mandar draft completo en el BODY.
    // -------------------------------------------------------

    if (!draftFromBody) {
      return NextResponse.json(
        { ok: false, error: "Draft data is required in request body" },
        { status: 400 }
      );
    }

    const draft = draftFromBody;

    if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one line is required" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 2) SI NO EXISTE QUOTEID → CREAR COTIZACIÓN NUEVA
    // -------------------------------------------------------
    let quoteRecord = null;

    if (!quoteId) {
      const quoteNumber = generateQuoteNumber();

      const { data: newQuote, error: qErr } = await supabaseAdmin
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          status: "SENT",
          customer_name: draft.customer_name,
          customer_phone: draft.customer_phone,
          customer_email: draft.customer_email,
          grand_total: 0
        })
        .select()
        .single();

      if (qErr || !newQuote) {
        throw new Error("Failed to create quote");
      }

      quoteRecord = newQuote;
    } else {
      // SI EXISTE, CARGAR LA QUOTE
      const { data: existingQuote, error: qErr } = await supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (qErr || !existingQuote) {
        throw new Error("Failed to load quote");
      }

      quoteRecord = existingQuote;

      // BORRAR LÍNEAS E ITEMS ANTERIORES PARA RECARGAR TODO
      await supabaseAdmin.from("quote_items").delete().eq("quote_id", quoteRecord.id);
      await supabaseAdmin.from("quote_lines").delete().eq("quote_id", quoteRecord.id);
    }

    // -------------------------------------------------------
    // 3) INSERTAR LÍNEAS E ITEMS
    // -------------------------------------------------------
    let grandTotal = 0;

    for (const ln of draft.lines) {
      const vehicleLabel = ln.vehicle || null;

      const { data: newLine, error: lineErr } = await supabaseAdmin
        .from("quote_lines")
        .insert({
          quote_id: quoteRecord.id,
          size: ln.size,
          requested_qty: ln.requested_qty,
          vehicle: vehicleLabel,
        })
        .select()
        .single();

      if (lineErr || !newLine) {
        throw new Error("Failed to insert quote line");
      }

      const includedOptions = (ln.options ?? []).filter(
        (o: any) => o.included !== false
      );

      for (const o of includedOptions) {
        const total = Number(o.total ?? 0);
        grandTotal += total;

        const { error: itemErr } = await supabaseAdmin.from("quote_items").insert({
          quote_id: quoteRecord.id,
          quote_line_id: newLine.id,
          tier: o.tier,
          brand: o.brand,
          model: o.model,
          provider: o.provider ?? "N/A",
          price_each: o.price_each,
          qty: o.qty,
          total,
        });

        if (itemErr) throw itemErr;
      }
    }

    // -------------------------------------------------------
    // 4) ACTUALIZAR TOTAL
    // -------------------------------------------------------
    await supabaseAdmin
      .from("quotes")
      .update({ grand_total: grandTotal })
      .eq("id", quoteRecord.id);

    return NextResponse.json({
      ok: true,
      quoteNumber: quoteRecord.quote_number,
      quoteId: quoteRecord.id,
    });
  } catch (err: any) {
    console.error("QUOTE STATUS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
