import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const make = url.searchParams.get("make");
    if (!make) return NextResponse.json({ error: "Missing make" }, { status: 400 });

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: mk, error: mkErr } = await supabase
      .from("vehicle_makes")
      .select("make_id")
      .eq("make_name", make)
      .maybeSingle();
    if (mkErr) throw mkErr;
    if (!mk?.make_id) return NextResponse.json({ models: [] });

    const { data, error } = await supabase
      .from("vehicle_models")
      .select("model_name")
      .eq("make_id", mk.make_id)
      .order("model_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ models: (data ?? []).map((x: any) => x.model_name) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
