
import { NextResponse } from "next/server";

/**
 * INCLUDE endpoint – v9 SAFE
 * Frontend usa este endpoint para togglear included,
 * pero en v7+ las opciones aún no viven en BD.
 * => Este endpoint debe ser NO-OP y responder OK.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.quoteItemId) {
      return NextResponse.json({ ok: false, error: "Missing quoteItemId" }, { status: 400 });
    }

    // No persistimos todavía (fase draft)
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
