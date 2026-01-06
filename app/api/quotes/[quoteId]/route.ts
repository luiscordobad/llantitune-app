import { NextResponse } from "next/server";

type RouteContext = {
  params: {
    quoteId: string;
  };
};

export async function GET(
  request: Request,
  context: RouteContext
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
