import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Minimal endpoint to update a quote status from the admin UI.
 * Body: { quoteId: string, status: "DRAFT"|"SENT"|"APPROVED"|"REJECTED" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const quoteId = (body?.quoteId ?? body?.quote_id ?? "").toString();
    const status = (body?.status ?? "").toString().toUpperCase();

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: "quoteId is required" }, { status: 400 });
    }
    if (!status || !["DRAFT", "SENT", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Valid status is required" }, { status: 400 });
    }

    const patch: Record<string, any> = { status };
    if (status === "SENT") patch.sent_at = new Date().toISOString();
    if (status === "APPROVED") patch.approved_at = new Date().toISOString();
    if (status === "REJECTED") patch.rejected_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("quotes")
      .update(patch)
      .eq("quote_id", quoteId)
      .select("quote_id,status,sent_at,approved_at,rejected_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
