import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function pick<T>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return fallback;
}

function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-4);
  return `LT-${y}${m}${day}-${t}`;
}

function generateQuoteNo(): number {
  // Your schema has `quotes.quote_no BIGINT NOT NULL` with no default.
  // `Date.now()` fits safely in JS number precision and in Postgres BIGINT.
  return Date.now();
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
  // PostgREST schema cache style
  if (msg.includes("Could not find") && msg.includes("column")) return true;
  // Postgres/PostgREST "does not exist" styles
  // examples:
  // - "column quotes.id does not exist"
  // - "column \"grand_total\" of relation \"quotes\" does not exist"
  if (msg.includes("column") && msg.includes("does not exist")) return true;
  return false;
}

function missingColumnName(err: any): string | null {
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/Could not find the '([^']+)' column/);
  if (m?.[1]) return m[1];

  // "column quotes.id does not exist" -> id
  const m2 = msg.match(/column\s+[\w]+\.([\w_]+)\s+does not exist/i);
  if (m2?.[1]) return m2[1];

  // "column \"grand_total\" of relation ... does not exist" -> grand_total
  const m3 = msg.match(/column\s+\"([^\"]+)\"\s+of\s+relation\s+\"[^\"]+\"\s+does not exist/i);
  if (m3?.[1]) return m3[1];

  return null;
}

async function safeUpdateByIdColumns(
  table: string,
  idCols: string[],
  idValue: string,
  updates: Record<string, any>,
  optionalKeys: string[]
) {
  let lastErr: any = null;
  for (const col of idCols) {
    const res = await safeUpdate(table, { [col]: idValue }, updates, optionalKeys);
    if (!res.error) return res;

    // If the id column doesn't exist, try next
    if (isMissingColumnError(res.error)) {
      lastErr = res.error;
      continue;
    }

    // Non-column issue -> stop
    return res;
  }
  return { error: lastErr ?? new Error("No valid id column for update") };
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

async function safeUpdateById(
  table: string,
  idValue: string,
  updates: Record<string, any>,
  optionalKeys: string[],
  idCols: string[]
) {
  let lastMissing: any = null;
  for (const col of idCols) {
    const { error } = await safeUpdate(table, { [col]: idValue }, updates, optionalKeys);
    if (!error) return;
    if (isMissingColumnError(error)) {
      lastMissing = error;
      continue;
    }
    throw error;
  }
  if (lastMissing) throw lastMissing;
  throw new Error(`Failed to update ${table}`);
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
    const headerPayload: Record<string, any> = {
      // In your Supabase schema, the PK is `quote_id` (not `id`).
      quote_id: finalQuoteId,
      quote_number: quoteNumber,
      status: "SENT",
      customer_name: draft.customer_name ?? draft.customerName ?? null,
      customer_phone: draft.customer_phone ?? draft.customerPhone ?? null,
      customer_email: draft.customer_email ?? draft.customerEmail ?? null,
      vehicle_text: (draft as any).vehicle_text ?? (draft as any).vehicleText ?? null,
    };

    if (!existing) {
      // Required field in your schema
      headerPayload.quote_no =
        (draft.quote_no as number) || (draft.quoteNo as number) || generateQuoteNo();
      await safeInsertSingle(
        "quotes",
        headerPayload,
        // optional columns to strip if your schema doesn't have them
        ["id", "quoteId", "vehicle_text"]
      );
    } else {
      // Update using whichever primary key column your `quotes` table actually has.
      // Common patterns are: id, quote_id, quoteId, uuid.
      const res = await safeUpdateByIdColumns(
        "quotes",
        ["id", "quote_id", "quoteId", "uuid"],
        finalQuoteId,
        headerPayload,
        ["id", "quoteId", "vehicle_text"]
      );
      if (res.error) throw res.error;
    }

    // -------------------------------------------------------
    // 2) Replace lines/items for this quote
    //    IMPORTANT: Your schema is strict, so we insert with the exact
    //    real column names (no best-effort aliases).
    //    Also: we only persist the INCLUDED options (as you requested).
    // -------------------------------------------------------
    await safeDeleteByQuoteId("quote_items", finalQuoteId);
    await safeDeleteByQuoteId("quote_lines", finalQuoteId);

    let grandTotal = 0;

    const lines = Array.isArray(draft.lines) ? draft.lines : [];
    for (let i = 0; i < lines.length; i++) {
      const ln: any = lines[i] ?? {};

      const size: string = String(ln.size ?? "").trim();
      if (!size) continue;

      const quantity = asNumber(ln.requestedQty ?? ln.requested_qty ?? ln.requested_qty ?? ln.qty ?? 1, 1);

      // Parse vehicle text like: "Ford Explorer 2014" (best-effort)
      const vehicleText: string = String(ln.vehicle ?? ln.vehicleText ?? "").trim();
      const parts = vehicleText.split(/\s+/).filter(Boolean);
      const maybeYear = parts.length ? Number(parts[parts.length - 1]) : NaN;
      const vehicle_year = Number.isFinite(maybeYear) ? maybeYear : null;
      const vehicle_make = parts.length ? parts[0] : null;
      const vehicle_model = parts.length >= 3 ? parts.slice(1, -1).join(" ") : parts.length >= 2 ? parts.slice(1).join(" ") : null;

      // Insert quote_lines and capture the real line_id generated by Postgres
      const { data: insertedLine, error: lineErr } = await supabaseAdmin
        .from("quote_lines")
        .insert({
          quote_id: finalQuoteId,
          line_no: i + 1,
          size,
          quantity,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_index: ln.vehicle_index ?? ln.vehicleIndex ?? null,
        })
        .select("line_id")
        .single();
      if (lineErr) throw lineErr;

      const line_id = (insertedLine as any)?.line_id as string;
      if (!line_id) throw new Error("Failed to persist quote_lines.line_id");

      const options = Array.isArray(ln.options) ? ln.options : [];
      const includedOptions = options.filter((o: any) => o?.included === true);

      let firstIncludedItemId: string | null = null;

      for (let k = 0; k < includedOptions.length; k++) {
        const o: any = includedOptions[k] ?? {};

        const qty = asNumber(o.qty ?? o.quoted_qty ?? o.quotedQty ?? quantity, quantity);
        const price_each = asNumber(o.price_each ?? o.priceEach ?? 0, 0);
        const total_tires = asNumber(o.total_tires ?? o.totalTires ?? o.total ?? price_each * qty, price_each * qty);
        const total_with_services = asNumber(o.total_with_services ?? o.totalWithServices ?? o.total_with_services ?? total_tires, total_tires);

        grandTotal += total_with_services;

        const { data: insertedItem, error: itemErr } = await supabaseAdmin
          .from("quote_items")
          .insert({
            quote_id: finalQuoteId,
            line_id,
            quote_line_id: line_id,
            included: true,
            rank: k + 1,
            provider: o.provider ?? "N/A",
            sku: o.sku ?? null,
            tire_id: o.tire_id ?? o.tireId ?? null,
            brand: o.brand ?? null,
            model: o.model ?? null,
            load_speed: o.load_speed ?? o.loadSpeed ?? null,
            size: o.size ?? size ?? null,
            stock: asNumber(o.stock ?? 0, 0),
            cost: asNumber(o.cost ?? 0, 0),
            price_each,
            total_tires,
            total_with_services,
          })
          .select("quote_item_id")
          .single();
        if (itemErr) throw itemErr;

        const quote_item_id = (insertedItem as any)?.quote_item_id as string;
        if (!firstIncludedItemId && quote_item_id) firstIncludedItemId = quote_item_id;
      }

      // If we inserted any included option, set it as the selected item
      if (firstIncludedItemId) {
        const { error: updLineErr } = await supabaseAdmin
          .from("quote_lines")
          .update({ selected_quote_item_id: firstIncludedItemId })
          .eq("line_id", line_id);
        if (updLineErr) throw updLineErr;
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
