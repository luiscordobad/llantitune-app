import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // 👇 obtenemos el ID desde la URL directamente
  const url = new URL(request.url);
  const quoteId = url.pathname.split("/").pop();

  if (!quoteId) {
    return NextResponse.json(
      { error: "Missing quoteId" },
      { status: 400 }
    );
  }

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
