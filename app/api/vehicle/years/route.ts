import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const make = url.searchParams.get("make");
    const model = url.searchParams.get("model");
    if (!make || !model) return NextResponse.json({ error: "Missing make/model" }, { status: 400 });

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
    if (!mk?.make_id) return NextResponse.json({ years: [] });

    const { data: md, error: mdErr } = await supabase
      .from("vehicle_models")
      .select("model_id")
      .eq("make_id", mk.make_id)
      .eq("model_name", model)
      .maybeSingle();
    if (mdErr) throw mdErr;
    if (!md?.model_id) return NextResponse.json({ years: [] });

    const { data, error } = await supabase
      .from("vehicle_years")
      .select("year")
      .eq("model_id", md.model_id)
      .order("year", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ years: (data ?? []).map((x: any) => x.year) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
