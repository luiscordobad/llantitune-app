import { NextResponse } from "next/server";
import { selectQuoteItem } from "@/lib/quotes/selectQuoteItem";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quoteId = body.quote_id ?? body.quoteId;
    const lineId = body.line_id ?? body.lineId;
    const quoteItemId = body.quote_item_id ?? body.quoteItemId;

    if (!quoteId || !lineId || !quoteItemId) {
      return NextResponse.json(
        { ok: false, error: "quote_id, line_id and quote_item_id are required" },
        { status: 400 }
      );
    }

    const res = await selectQuoteItem({ quoteId, lineId, quoteItemId });
    if (!res.ok) {
      const errMsg = (res as any)?.error ?? "Failed to select quote item";
      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
