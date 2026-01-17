import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quoteId = body.quoteId as string;
    const lineId = body.lineId as string;
    const quoteItemId = body.quoteItemId as string;

    if (!quoteId || !lineId || !quoteItemId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate item belongs to quote+line
    const { data: item, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_item_id", quoteItemId)
      .eq("quote_id", quoteId)
      .eq("line_id", lineId)
      .single();
    if (iErr) throw iErr;

    const { data: line, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("*")
      .eq("line_id", lineId)
      .eq("quote_id", quoteId)
      .single();
    if (lErr) throw lErr;

    const requestedQty = Number(line.quantity ?? 1);
    const stock = Number(item.stock ?? 0);
    const qty = Math.max(1, Math.min(requestedQty, stock || requestedQty));

    // Update selection on quote line
    const { error: uErr } = await supabaseAdmin
      .from("quote_lines")
      .update({ selected_quote_item_id: quoteItemId })
      .eq("line_id", lineId);
    if (uErr) throw uErr;

    // Upsert order header
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .upsert({ quote_id: quoteId, status: "DRAFT" }, { onConflict: "quote_id" })
      .select("order_id")
      .single();
    if (oErr) throw oErr;

    const total = Number(item.price_each ?? 0) * qty;

    // Upsert order item for this line (one per line)
    const { error: oiErr } = await supabaseAdmin
      .from("order_items")
      .upsert({
        order_id: order.order_id,
        line_id: lineId,
        quote_item_id: quoteItemId,
        provider: item.provider,
        sku: item.sku,
        size: item.size,
        brand: item.brand,
        model: item.model,
        load_speed: item.load_speed,
        qty,
        stock: item.stock,
        cost_each: item.cost,
        price_each: item.price_each,
        total
      }, { onConflict: "line_id" });
    // Note: onConflict requires unique constraint; if missing we will instead delete+insert in later revision.
    if (oiErr) {
      // fallback: delete existing items for this line and insert
      await supabaseAdmin.from("order_items").delete().eq("order_id", order.order_id).eq("line_id", lineId);
      const { error: insErr } = await supabaseAdmin.from("order_items").insert({
        order_id: order.order_id,
        line_id: lineId,
        quote_item_id: quoteItemId,
        provider: item.provider,
        sku: item.sku,
        size: item.size,
        brand: item.brand,
        model: item.model,
        load_speed: item.load_speed,
        qty,
        stock: item.stock,
        cost_each: item.cost,
        price_each: item.price_each,
        total
      });
      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true, qty, requestedQty, stock });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
