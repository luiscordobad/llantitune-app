"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Persists the selection for a single quote line:
 * - sets quote_lines.selected_quote_item_id
 * - ensures ONLY the chosen quote_item is included for that line
 */
export async function selectQuoteItem(params: {
  quoteId: string;
  lineId: string;
  quoteItemId: string;
}) {
  const { quoteId, lineId, quoteItemId } = params;
  const supabase = await createClient();

  // 1) Persist selection on the line
  const { error: lineErr } = await supabase
    .from("quote_lines")
    .update({ selected_quote_item_id: quoteItemId })
    .eq("quote_id", quoteId)
    .eq("line_id", lineId);
  if (lineErr) throw lineErr;

  // 2) Clear included for items in THIS line only
  const { error: clearErr } = await supabase
    .from("quote_items")
    .update({ included: false })
    .eq("quote_id", quoteId)
    .eq("line_id", lineId);
  if (clearErr) throw clearErr;

  // 3) Mark selected item included
  const { error: setErr } = await supabase
    .from("quote_items")
    .update({ included: true })
    .eq("quote_item_id", quoteItemId)
    .eq("quote_id", quoteId);
  if (setErr) throw setErr;

  return { ok: true };
}
