import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const ALLOWED = new Set(["RECEIVED","INSTALLED","CLOSED"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, status, note } = body ?? {};
    if (!orderId || !status) return NextResponse.json({ error: "Missing orderId/status" }, { status: 400 });
    if (!ALLOWED.has(status)) return NextResponse.json({ error: "Status not allowed" }, { status: 400 });

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: before, error: bErr } = await supabase.from("orders").select("status").eq("order_id", orderId).single();
    if (bErr) throw bErr;

    const patch: any = { status };
    if (status === "INSTALLED") patch.attended_by = user.id;

    const { error: uErr } = await supabase.from("orders").update(patch).eq("order_id", orderId);
    if (uErr) throw uErr;

    const fromStatus = before?.status ?? null;
    if (status !== fromStatus) {
      await supabase.from("timeline_events").insert([{
        entity_type: "ORDER",
        entity_id: orderId,
        event_type: "STATUS_CHANGE",
        from_status: String(fromStatus),
        to_status: String(status),
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
