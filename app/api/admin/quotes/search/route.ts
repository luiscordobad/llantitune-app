
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ rows: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("quotes")
      .select(`
        quote_id,
        quote_number,
        quote_no,
        created_at,
        status,
        customer_name,
        customer_phone,
        customer_email,
        vehicle_text
      `)
      .or(
        `customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_email.ilike.%${q}%,quote_number.ilike.%${q}%`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
