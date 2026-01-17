import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type QuoteRow = Record<string, any>;

function pick<T extends QuoteRow>(row: T, keys: string[]) {
  for (const k of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return undefined;
}

/**
 * Fetch quotes in a schema-tolerant way.
 * Your Supabase schema has changed across iterations (quote_id vs id, quote_number vs quote_no, etc.).
 * To avoid "column does not exist" errors, we select "*" and then pick the fields we need.
 */
export async function getQuotes(limit = 50) {
  // First attempt: order by quote_id desc (works for numeric ids, and even for uuids it's a stable sort)
  const attempt1 = await supabaseAdmin
    .from("quotes")
    .select("*")
    // @ts-ignore supabase types are dynamic here
    .order("quote_id", { ascending: false })
    .limit(limit);

  let data = attempt1.data as QuoteRow[] | null;
  let error = attempt1.error;

  // Fallback: no ordering (in case quote_id isn't orderable in your schema cache)
  if (error) {
    const attempt2 = await supabaseAdmin.from("quotes").select("*").limit(limit);
    data = attempt2.data as QuoteRow[] | null;
    error = attempt2.error;
  }

  if (error) throw error;

  const rows = data ?? [];

  return rows.map((r) => {
    const quoteId = pick(r, ["quote_id", "id"]);
    const quoteNumber = pick(r, ["quote_number", "quote_no", "quoteNumber"]);
    const customerEmail = pick(r, ["customer_email", "email"]);
    const customerName = pick(r, ["customer_name", "customer"]);
    const status = pick(r, ["status", "quote_status"]);
    const vehicleMake = pick(r, ["vehicle_make", "make"]);
    const vehicleModel = pick(r, ["vehicle_model", "model"]);
    const vehicleYear = pick(r, ["vehicle_year", "year"]);
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
      min_stock: minStock,
      created_at: createdAt,
      _raw: r,
    };
  });
}
