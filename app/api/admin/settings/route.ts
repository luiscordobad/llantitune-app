import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entries = Object.entries(body ?? {}).map(([key, value]) => ({
      key,
      value_numeric: typeof value === "number" ? value : null,
      value_text: typeof value === "string" ? value : null
    }));
    const { error } = await supabaseAdmin.from("settings").upsert(entries, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
