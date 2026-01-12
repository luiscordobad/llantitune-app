
import { NextResponse } from "next/server";

/**
 * STATUS endpoint – v9 SAFE
 * Evita crash cuando aún no hay cotizaciones persistidas.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.quoteId || !body?.status) {
      return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
    }

    // Aún no persistimos en BD: responder OK para continuar flujo
    return NextResponse.json({
      ok: true,
      quoteNumber: body.status === "SENT" ? "LT-" + Date.now() : null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
