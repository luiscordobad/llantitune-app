import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, patch, note } = body ?? {};
    if (!orderId || !patch) return NextResponse.json({ error: "Missing orderId/patch" }, { status: 400 });

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admin/staff can use this endpoint
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = String((me as any)?.role ?? "").toLowerCase();
    if (role !== "admin" && role !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: before, error: bErr } = await supabase.from("orders").select("status").eq("order_id", orderId).single();
    if (bErr) throw bErr;

    const { error: uErr } = await supabase.from("orders").update(patch).eq("order_id", orderId);
    if (uErr) throw uErr;

    const toStatus = patch.status ?? null;
    const fromStatus = before?.status ?? null;

    if (toStatus && toStatus !== fromStatus) {
      await supabase.from("timeline_events").insert([{
        entity_type: "ORDER",
        entity_id: orderId,
        event_type: "STATUS_CHANGE",
        from_status: String(fromStatus),
        to_status: String(toStatus),
        note: note ?? null,
        created_by: user.id
      }]);
    } else if (note) {
      await supabase.from("timeline_events").insert([{
        entity_type: "ORDER",
        entity_id: orderId,
        event_type: "NOTE",
        note: note,
        created_by: user.id
      }]);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
