import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quoteItemId = body.quoteItemId as string;
    const included = !!body.included;
    if (!quoteItemId) return NextResponse.json({ error: "quoteItemId required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("quote_items")
      .update({ included })
      .eq("quote_item_id", quoteItemId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
