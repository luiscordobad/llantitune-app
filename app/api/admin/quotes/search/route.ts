import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: uErr,
    } = await supabase.auth.getUser();
    if (uErr) throw uErr;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (pErr) throw pErr;

    const role = String(prof?.role ?? "").toLowerCase();
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ rows: [] });

    const pattern = `%${q}%`;

    const { data, error } = await supabase
      .from("quotes")
      .select(
        "quote_id, created_at, quote_no, quote_number, status, customer_id, customer_name, customer_phone, customer_email, vehicle_text, size, quantity"
      )
      .or(
        [
          `quote_number.ilike.${pattern}`,
          `customer_phone.ilike.${pattern}`,
          `customer_name.ilike.${pattern}`,
          `customer_email.ilike.${pattern}`,
          `vehicle_text.ilike.${pattern}`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
