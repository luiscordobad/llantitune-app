import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value_numeric, value_text");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map: any = {};
  for (const r of data ?? []) {
    map[r.key] = r.value_numeric ?? r.value_text ?? null;
  }
  return NextResponse.json({ settings: map });
}
