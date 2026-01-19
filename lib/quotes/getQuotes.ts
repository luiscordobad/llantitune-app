import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type QuoteRow = Record<string, any>;

function pick<T extends QuoteRow>(row: T, keys: string[]) {
  for (const k of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return undefined;
}

function mapQuote(r: QuoteRow) {
  const quoteId = pick(r, ["quote_id", "id"]);
  const quoteNumber = pick(r, ["quote_number", "quote_no", "quoteNumber"]);
  const customerEmail = pick(r, ["customer_email", "email"]);
  const customerName = pick(r, ["customer_name", "customer"]);
  const status = pick(r, ["status", "quote_status"]);
  const vehicleMake = pick(r, ["vehicle_make", "make"]);
  const vehicleModel = pick(r, ["vehicle_model", "model"]);
  const vehicleYear = pick(r, ["vehicle_year", "year"]);
  const vehicleText = pick(r, ["vehicle_text", "vehicleText"]);
  const minStock = pick(r, ["min_stock", "minStock"]);
  const createdAt = pick(r, ["created_at", "createdAt"]);

  return {
    quote_id: quoteId,
    quote_number: quoteNumber,
    customer_email: customerEmail,
    customer_name: customerName,
    status,
    vehicle_make: vehicleMake,
    vehicle_model: vehicleModel,
    vehicle_year: vehicleYear,
    vehicle_text: vehicleText,
    min_stock: minStock,
    created_at: createdAt,
    _raw: r,
  };
}

async function applyBestOrdering<T>(
  makeQuery: () => any
): Promise<{ data: T[] | null; error: any; count?: number | null }> {
  // Try a few stable "newest first" candidates in order.
  // If a column doesn't exist in PostgREST schema cache, Supabase returns an error.
  const orderCandidates = [
    { col: "created_at", opts: { ascending: false } },
    { col: "sent_at", opts: { ascending: false, nullsFirst: false } },
    { col: "quote_no", opts: { ascending: false } },
    { col: "quote_id", opts: { ascending: false } },
  ] as const;

  for (const c of orderCandidates) {
    const q = makeQuery().order(c.col as any, c.opts as any);
    const res = await q;
    if (!res.error) return res;
  }
  // Last resort: no ordering
  const res = await makeQuery();
  return res;
}

export async function getQuotesPaged(params: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(5, params.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // We select "*" to be schema-tolerant, but we also ask for an exact count so we can paginate.
  const make = () => supabaseAdmin.from("quotes").select("*", { count: "exact" }).range(from, to);

  const res = await applyBestOrdering<QuoteRow>(make);
  if (res.error) throw res.error;

  const rows = (res.data ?? []).map(mapQuote);
  const total = typeof res.count === "number" ? res.count : rows.length;

  return { rows, total, page, pageSize };
}

/**
 * Fetch quotes in a schema-tolerant way.
 * Your Supabase schema has changed across iterations (quote_id vs id, quote_number vs quote_no, etc.).
 * To avoid "column does not exist" errors, we select "*" and then pick the fields we need.
 */
export async function getQuotes(limit = 50) {
  const { rows } = await getQuotesPaged({ page: 1, pageSize: Math.min(200, Math.max(1, limit)) });
  return rows;
}
