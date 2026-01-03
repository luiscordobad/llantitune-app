import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

function fmtQuoteNumber(createdAt: string, quoteNo: number) {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `LT-${y}${m}${dd}-${String(quoteNo).padStart(5, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quoteId = url.searchParams.get("quoteId");
    if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    const quoteNumber = fmtQuoteNumber(q.created_at, Number(q.quote_no));

    const { data: lines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });
    if (lErr) throw lErr;

    const { data: items, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("line_id", { ascending: true })
      .order("rank", { ascending: true });
    if (iErr) throw iErr;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // Letter
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = 760;
    const left = 48;

    const draw = (text: string, size = 11, isBold = false) => {
      page.drawText(text, { x: left, y, size, font: isBold ? bold : font });
      y -= size + 6;
    };

    draw("Llantitune", 18, true);
    y -= 2;
    draw("Cotización", 13, true);
    draw(`No. ${quoteNumber}`, 11, true);
    draw(`Fecha: ${new Date(q.created_at).toLocaleString()}`, 10);

    if (q.customer_name) draw(`Cliente: ${q.customer_name}`, 11);
    if (q.customer_phone) draw(`WhatsApp: ${q.customer_phone}`, 11);
    if (q.vehicle_text) draw(`Vehículo: ${q.vehicle_text}`, 11);

    y -= 10;
    draw("Opciones:", 12, true);

    const itemsByLine = new Map<string, any[]>();
    for (const it of items ?? []) {
      const key = String(it.line_id);
      if (!itemsByLine.has(key)) itemsByLine.set(key, []);
      itemsByLine.get(key)!.push(it);
    }

    for (const ln of lines ?? []) {
      if (y < 120) break;
      draw(`• ${ln.size} (x${ln.quantity})`, 11, true);

      const its = (itemsByLine.get(String(ln.line_id)) ?? []).slice(0, 8);
      if (!its.length) {
        draw(`  Sin opciones con stock suficiente.`, 10);
        y -= 6;
        continue;
      }

      for (const it of its) {
        if (y < 100) break;
        const line = `  #${it.rank} ${it.brand} | ${it.load_speed ?? ""} | $${it.price_each} c/u | Total: $${it.total_with_services}`;
        draw(line, 10);
      }
      y -= 6;
    }

    draw("Notas:", 11, true);
    draw("Precios sujetos a disponibilidad.", 10);

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Llantitune_Cotizacion_${quoteNumber}.pdf"`
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
