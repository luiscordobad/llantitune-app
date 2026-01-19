import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

function safeInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Approving a quote creates (or updates) a Work Order:
 * - quote.status must be SENT
 * - at least one line must have selected_quote_item_id
 * - creates/updates orders row (status: DRAFT)
 * - (re)builds order_items from selected quote items
 * - sets quote.status = APPROVED and approved_at
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quoteId = String(body?.quote_id ?? "").trim();
    if (!quoteId) return NextResponse.json({ error: "Missing quote_id" }, { status: 400 });

    // Auth (must be admin or staff)
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const myRole = String((me as any)?.role ?? "").toLowerCase();
    if (myRole !== "admin" && myRole !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Quote header
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, status, promised_at, internal_notes, deposit_amount")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    const status = quote?.status as QuoteStatus;
    if (status !== "SENT") {
      return NextResponse.json({ error: `Quote must be SENT (current: ${status})` }, { status: 400 });
    }

    // Quote lines with selections
    const { data: lines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("line_id, quantity, size, selected_quote_item_id")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });
    if (lErr) throw lErr;

    const selected = (lines ?? []).filter((ln: any) => ln.selected_quote_item_id);
    if (!selected.length) {
      return NextResponse.json({ error: "No selection found. Select at least one option first." }, { status: 400 });
    }

    const selectedItemIds = selected.map((ln: any) => ln.selected_quote_item_id);
    const { data: items, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("quote_item_id, provider, sku, tire_id, size, brand, model, load_speed, stock, cost, price_each")
      .in("quote_item_id", selectedItemIds);
    if (iErr) throw iErr;

    const itemById = new Map<string, any>();
    for (const it of items ?? []) itemById.set(String(it.quote_item_id), it);

    // Upsert order header (unassigned by default)
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .upsert(
        {
          quote_id: quoteId,
          // orders.status is CHECK-constrained in the DB (see migrations).
          // Valid values: DRAFT, ORDERED, RECEIVED, INSTALLED, CLOSED.
          // A freshly-created work order should start as DRAFT.
          status: "DRAFT",
          promised_at: quote.promised_at ?? null,
          internal_notes: quote.internal_notes ?? null,
          deposit_amount: quote.deposit_amount ?? null,
          assigned_to: null,
        },
        { onConflict: "quote_id" }
      )
      .select("order_id")
      .single();
    if (oErr) throw oErr;

    const orderId = String(order.order_id);

    // Rebuild order items
    await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);

    const orderItemsToInsert: any[] = [];
    for (const ln of selected) {
      const it = itemById.get(String(ln.selected_quote_item_id));
      if (!it) continue;

      const requestedQty = Math.max(1, safeInt(ln.quantity, 1));
      const stock = safeNum(it.stock, 0);
      const qty = stock > 0 ? Math.max(1, Math.min(requestedQty, Math.trunc(stock))) : requestedQty;

      const priceEach = safeNum(it.price_each, 0);
      const total = priceEach * qty;

      orderItemsToInsert.push({
        order_id: orderId,
        line_id: ln.line_id,
        quote_item_id: it.quote_item_id,
        provider: it.provider,
        sku: it.sku,
        size: it.size ?? ln.size,
        brand: it.brand,
        model: it.model,
        load_speed: it.load_speed,
        qty,
        stock: it.stock,
        cost_each: it.cost,
        price_each: it.price_each,
        total,
      });
    }

    if (orderItemsToInsert.length) {
      const { error: insErr } = await supabaseAdmin.from("order_items").insert(orderItemsToInsert);
      if (insErr) throw insErr;
    }

    // Update quote status
    const { error: uqErr } = await supabaseAdmin
      .from("quotes")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() })
      .eq("quote_id", quoteId);
    if (uqErr) throw uqErr;

    // Timeline (best effort)
    try {
      await supabaseAdmin.from("timeline_events").insert([
        {
          entity_type: "QUOTE",
          entity_id: quoteId,
          event_type: "APPROVED",
          from_status: "SENT",
          to_status: "APPROVED",
          note: null,
          created_by: user.id,
        },
        {
          entity_type: "ORDER",
          entity_id: orderId,
          event_type: "CREATED_FROM_QUOTE",
          from_status: null,
          to_status: "PENDING",
          note: null,
          created_by: user.id,
        },
      ]);
    } catch {
      // ignore timeline failures
    }

    return NextResponse.json({ ok: true, order_id: orderId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
