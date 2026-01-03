import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name");

    if (error) throw error;
    return NextResponse.json({ profiles: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
