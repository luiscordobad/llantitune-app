import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-4);
  return `LT-${y}${m}${day}-${t}`;
}

function asNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Supabase "schema cache" errors happen when the code references a column
 * that doesn't exist in your actual table schema.
 *
 * Because your Supabase tables can differ from the code assumptions, we use
 * a best-effort strategy: try including optional columns (like vehicle_text)
 * and if Supabase returns a missing-column error, retry without them.
 */
function isMissingColumnError(err: any) {
  const msg = String(err?.message ?? err ?? "");
  return msg.includes("Could not find") && msg.includes("column");
}

function missingColumnName(err: any): string | null {
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/Could not find the '([^']+)' column/);
  return m?.[1] ?? null;
}

async function safeInsertSingle(
  table: string,
  payload: Record<string, any>,
  optionalKeys: string[]
) {
  // Try, and if Supabase complains about a missing column, remove just that
  // column (or the provided optional keys) and retry a few times.
  let current = { ...payload };
  for (let i = 0; i < 5; i++) {
    let { data, error } = await supabaseAdmin
      .from(table)
      .insert(current)
      .select()
      .single();

    if (!error) return { data, error: null as any };

    if (!isMissingColumnError(error)) return { data: null, error };

    const missing = missingColumnName(error);
    if (missing && missing in current) {
      delete (current as any)[missing];
      continue;
    }

    // Fallback: drop all optional keys once
    if (optionalKeys.length) {
      for (const k of optionalKeys) delete (current as any)[k];
      // prevent infinite loop if we already dropped them
      optionalKeys = [];
      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error("Insert failed after retries") };
}

async function safeUpdate(
  table: string,
  match: Record<string, any>,
  updates: Record<string, any>,
  optionalKeys: string[]
) {
  let current = { ...updates };
  for (let i = 0; i < 5; i++) {
    let q = supabaseAdmin.from(table).update(current);
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v as any);
    const { error } = await q;
    if (!error) return { error: null as any };
    if (!isMissingColumnError(error)) return { error };

    const missing = missingColumnName(error);
    if (missing && missing in current) {
      delete (current as any)[missing];
      continue;
    }

    if (optionalKeys.length) {
      for (const k of optionalKeys) delete (current as any)[k];
      optionalKeys = [];
      continue;
    }

    return { error };
  }

  return { error: new Error("Update failed after retries") };
}

async function safeDeleteByQuoteId(table: string, quoteId: string) {
  const cols = ["quote_id", "quoteId", "quote_uuid", "quote", "quote_pk"]; // fallback order
  let lastErr: any = null;
  for (const col of cols) {
    const { error } = await supabaseAdmin.from(table).delete().eq(col, quoteId);
    if (!error) return;
    if (isMissingColumnError(error)) {
      lastErr = error;
      continue;
    }
    throw error;
  }
  throw lastErr ?? new Error(`Could not delete from ${table}: no quote id column matched`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, quoteId, draft: draftFromBody } = body ?? {};

    if (status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "Only SENT status is supported" },
        { status: 400 }
      );
    }

    if (!draftFromBody) {
      return NextResponse.json(
        { ok: false, error: "Draft data is required in request body" },
        { status: 400 }
      );
    }

    const draft = draftFromBody as any;

    // Prefer explicit quoteId (top-level) then draft.quoteId; if missing, create one.
    const finalQuoteId: string =
      (quoteId as string) || (draft.quoteId as string) ||
      (globalThis.crypto?.randomUUID?.() ?? "");

    if (!finalQuoteId) {
      return NextResponse.json(
        { ok: false, error: "quoteId is required (could not be generated)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one line is required" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 1) Ensure quote header exists (create if missing)
    // -------------------------------------------------------
    // Different DBs may key the quote by `id` (uuid) or by a custom `quote_id`.
    // We prefer `id` and fall back to `quote_id` if needed.
    let existing: any = null;
    {
      const r1 = await supabaseAdmin
        .from("quotes")
        .select("id, quote_number")
        .eq("id", finalQuoteId)
        .maybeSingle();

      if (r1.error && isMissingColumnError(r1.error)) {
        const r2 = await supabaseAdmin
          .from("quotes")
          .select("quote_id, quote_number")
          .eq("quote_id", finalQuoteId)
          .maybeSingle();
        if (r2.error) throw r2.error;
        existing = r2.data;
      } else {
        if (r1.error) throw r1.error;
        existing = r1.data;
      }
    }

    let quoteNumber: string =
      (draft.quoteNumber as string) || existing?.quote_number || "";

    if (!quoteNumber || quoteNumber === "BORRADOR") {
      quoteNumber = generateQuoteNumber();
    }

    // Create quote row if it doesn't exist; otherwise update header basics.
    // NOTE: Some deployments don't have columns like `vehicle_text` or even `quote_id`.
    // We retry without optional columns so the API doesn't 500.
    const headerPayload = {
      id: finalQuoteId,
      quote_id: finalQuoteId,
      quoteId: finalQuoteId,
      quote_number: quoteNumber,
      status: "SENT",
      customer_name: draft.customer_name ?? draft.customerName ?? null,
      customer_phone: draft.customer_phone ?? draft.customerPhone ?? null,
      customer_email: draft.customer_email ?? draft.customerEmail ?? null,
      vehicle_text: (draft as any).vehicle_text ?? (draft as any).vehicleText ?? null,
    } as Record<string, any>;

    if (!existing) {
      await safeInsertSingle(
        "quotes",
        headerPayload,
        // optional columns to strip if your schema doesn't have them
        ["quote_id", "quoteId", "vehicle_text"]
      );
    } else {
      const { id, ...updatePayload } = headerPayload;
      await safeUpdate(
        "quotes",
        updatePayload,
        (q: any) => q.eq("id", finalQuoteId),
        ["quote_id", "quoteId", "vehicle_text"]
      );
    }

    // -------------------------------------------------------
    // 2) Replace lines/items for this quote
    // -------------------------------------------------------
    // Clear old draft content (FK column name varies by schema)
    await safeDeleteByQuoteId("quote_items", finalQuoteId);
    await safeDeleteByQuoteId("quote_lines", finalQuoteId);

    let grandTotal = 0;

    for (let i = 0; i < draft.lines.length; i++) {
      const ln = draft.lines[i];

      const lineId: string =
        (ln.lineId as string) || (globalThis.crypto?.randomUUID?.() ?? "");
      if (!lineId) {
        throw new Error("Failed to generate lineId");
      }

      const size = ln.size;
      const quantity = asNumber(ln.requestedQty ?? ln.requested_qty ?? ln.qty ?? 1, 1);
      const vehicleText = ln.vehicle ?? ln.vehicleText ?? null;

      // Insert line with schema-flexible keys (some projects use different column names)
      const linePayload: Record<string, any> = {
        quote_id: finalQuoteId,
        quoteId: finalQuoteId,
        line_id: lineId,
        lineId: lineId,
        line_no: i + 1,
        size,
        quantity,
        requested_qty: quantity,
        requestedQty: quantity,
        vehicle_text: vehicleText,
        vehicle: vehicleText,
      };

      await safeInsertSingle("quote_lines", linePayload, [
        "quoteId",
        "lineId",
        "line_no",
        "quantity",
        "requested_qty",
        "requestedQty",
        "vehicle_text",
        "vehicle",
      ]);

      const options = Array.isArray(ln.options) ? ln.options : [];
      const included = options.filter((o: any) => o?.included !== false);

      for (const o of included) {
        const quoteItemId: string =
          (o.quoteItemId as string) || (globalThis.crypto?.randomUUID?.() ?? "");
        if (!quoteItemId) throw new Error("Failed to generate quoteItemId");

        const qty = asNumber(o.qty ?? o.quotedQty ?? quantity, quantity);
        const priceEach = asNumber(o.price_each ?? o.priceEach ?? 0, 0);
        const total = asNumber(o.total ?? o.totalTires ?? priceEach * qty, priceEach * qty);

        grandTotal += total;

        const itemPayload: Record<string, any> = {
          quote_id: finalQuoteId,
          quoteId: finalQuoteId,
          line_id: lineId,
          lineId: lineId,
          quote_item_id: quoteItemId,
          quoteItemId: quoteItemId,

          tier: o.tier ?? null,
          provider: o.provider ?? "N/A",
          sku: o.sku ?? null,
          size: o.size ?? size ?? null,
          brand: o.brand ?? null,
          model: o.model ?? null,
          load_speed: o.loadSpeed ?? o.load_speed ?? null,

          stock: asNumber(o.stock ?? 0, 0),
          cost: asNumber(o.cost ?? o.cost_each ?? 0, 0),
          price_each: priceEach,

          qty,
          total,
        };

        await safeInsertSingle("quote_items", itemPayload, [
          "quoteId",
          "lineId",
          "quoteItemId",
          "load_speed",
          "stock",
          "cost",
        ]);
      }
    }

    // -------------------------------------------------------
    // 3) Update totals (best-effort)
    //    Nota: tu tabla `quotes` puede NO tener columna `grand_total`.
    //    Si no existe, no rompemos el flujo: los totales viven en quote_items.
    // -------------------------------------------------------
    // Totals: schema-flexible, do not break if columns differ
    await safeUpdate(
      "quotes",
      { id: finalQuoteId },
      { grand_total: grandTotal, total: grandTotal, grandTotal },
      ["grand_total", "total", "grandTotal"]
    );

    return NextResponse.json({
      ok: true,
      quoteId: finalQuoteId,
      quoteNumber,
      grandTotal,
    });
  } catch (err: any) {
    console.error("QUOTE STATUS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
