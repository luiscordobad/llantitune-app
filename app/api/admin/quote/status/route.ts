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

    // ---------------------------------------------------------
    // 1) CARGAR DATOS DESDE TABLAS REALES (NO drafts)
    // ---------------------------------------------------------
    if (!draft && quoteId) {
      // Cargar información básica de la cotización
      const { data: quoteData, error: qErr } = await supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (qErr) {
        console.error("ERROR LOADING QUOTE:", qErr);
        throw new Error("Failed to load quote");
      }

      // Cargar las líneas
      const { data: linesData, error: lErr } = await supabaseAdmin
        .from("quote_lines")
        .select(`
          id,
          size,
          requested_qty,
          vehicle,
          quote_items (
            tier,
            brand,
            model,
            provider,
            price_each,
            qty,
            total
          )
        `)
        .eq("quote_id", quoteId);

      if (lErr) {
        console.error("ERROR LOADING LINES:", lErr);
        throw new Error("Failed to load quote lines");
      }

      draft = {
        customer_name: quoteData.customer_name,
        customer_phone: quoteData.customer_phone,
        customer_email: quoteData.customer_email,
        lines: linesData?.map((ln: any) => ({
          ...ln,
          options: ln.quote_items ?? [],
        })) ?? [],
      };
    }

    // ---------------------------------------------------------
    // 2) VALIDACIÓN BÁSICA
    // ---------------------------------------------------------
    if (!draft) {
      return NextResponse.json(
        { ok: false, error: "Draft not found" },
        { status: 400 }
      );
    }

    if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one line is required" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3) INSERTAR COTIZACIÓN
    // ---------------------------------------------------------
    const quoteNumber = generateQuoteNumber();

    const { data: newQuote, error: quoteErr } = await supabaseAdmin
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

    if (quoteErr || !newQuote) {
      console.error("ERROR INSERTING QUOTE:", quoteErr);
      throw new Error("Failed to insert quote");
    }

    // ---------------------------------------------------------
    // 4) INSERTAR LÍNEAS + ITEMS
    // ---------------------------------------------------------
    let grandTotal = 0;

    for (const ln of draft.lines) {
      const vehicleLabel = ln.vehicle || null;

      const { data: newLine, error: lineErr } = await supabaseAdmin
        .from("quote_lines")
        .insert({
          quote_id: newQuote.id,
          size: ln.size,
          requested_qty: ln.requested_qty,
          vehicle: vehicleLabel,
        })
        .select()
        .single();

      if (lineErr || !newLine) {
        console.error("ERROR INSERTING QUOTE LINE:", lineErr);
        throw new Error("Failed to insert quote line");
      }

      const includedOptions = (ln.options ?? []).filter(
        (o: any) => o.included !== false
      );

      if (!includedOptions.length) {
        throw new Error("Each line must have at least one included option");
      }

      for (const o of includedOptions) {
        const total = Number(o.total ?? 0);
        grandTotal += total;

        const { error: itemErr } = await supabaseAdmin.from("quote_items").insert({
          quote_id: newQuote.id,
          quote_line_id: newLine.id,
          tier: o.tier,
          brand: o.brand,
          model: o.model,
          provider: o.provider ?? "N/A",
          price_each: o.price_each,
          qty: o.qty,
          total,
        });

        if (itemErr) {
          console.error("ERROR INSERTING ITEM:", itemErr);
          throw itemErr;
        }
      }
    }

    // ---------------------------------------------------------
    // 5) ACTUALIZAR TOTAL
    // ---------------------------------------------------------
    await supabaseAdmin
      .from("quotes")
      .update({ grand_total: grandTotal })
      .eq("id", newQuote.id);

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
