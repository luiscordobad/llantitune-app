import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

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

    const { data: items, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
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
    y -= 4;
    draw(`Cotización: ${q.size} (x${q.quantity})`, 13, true);
    draw(`Fecha: ${new Date(q.created_at).toLocaleString()}`, 10);

    if (q.customer_name) draw(`Cliente: ${q.customer_name}`, 11);
    if (q.customer_phone) draw(`WhatsApp: ${q.customer_phone}`, 11);
    if (q.vehicle_text) draw(`Vehículo: ${q.vehicle_text}`, 11);

    y -= 6;
    draw(`Markup: ${q.markup_pct}% | Instalación: $${q.install_each} c/u | Extras: $${q.extras_each} c/u`, 10);

    y -= 10;
    draw("Opciones (top):", 12, true);

    const top = (items ?? []).slice(0, 12);
    for (const it of top) {
      const line = `#${it.rank} ${it.brand} | ${it.load_speed ?? ""} | $${it.price_each} c/u | Total: $${it.total_with_services} | Prov: ${it.provider}`;
      if (y < 90) break;
      draw(line, 10);
    }

    y -= 10;
    draw("Notas:", 11, true);
    draw("Precios sujetos a disponibilidad y cambios de proveedor.", 10);

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Llantitune_Cotizacion_${q.size}.pdf"`
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
