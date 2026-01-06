import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  const { quoteId } = params;

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
