import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  const quoteId = params.quoteId as string;

  let query = supabase.from("quotes").select("*");

  // UUID vs folio
  if (quoteId.includes("-")) {
    query = query.eq("id", quoteId);
  } else {
    query = query.eq("folio", quoteId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Quote not found", quoteId },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
