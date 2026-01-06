import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: any
) {
  const { quoteId } = context.params;

  return NextResponse.json({
    id: quoteId,
    status: "SENT",
    items: [],
    customer: {
      name: "Demo",
      phone: "0000000000",
    },
  });
}
