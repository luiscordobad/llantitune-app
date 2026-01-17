import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { QuoteRow } from "./getQuotes";

/**
 * Backwards-compatible helper.
 * If your DB has a `status` column we filter to DRAFT/SENT.
 * If not, we simply return the most recent rows.
 */
export async function getQuotesDraftAndSent(limit = 100): Promise<QuoteRow[]> {
  const { data, error } = await supabaseAdmin.from("quotes").select("*").limit(limit);
  if (error) throw error;

  const rows: QuoteRow[] = (data ?? []) as any;

  const hasStatus = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "status"));
  if (!hasStatus) return rows;

  return rows.filter((r) => {
    const s = String((r as any).status ?? "").toUpperCase();
    return s === "DRAFT" || s === "SENT";
  });
}
