
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  return NextResponse.json({
    id: params.quoteId,
    status: "SENT",
    folio: "LLT-000013",
    message: "Quote loaded successfully"
  });
}
