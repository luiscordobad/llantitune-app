
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quoteId = searchParams.get("id");

  if (!quoteId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  return NextResponse.json({
    quote_id: quoteId,
    status: "SENT",
    customer_name: "Demo",
    items: []
  });
}
