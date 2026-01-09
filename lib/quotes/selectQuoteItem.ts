'use server'

import { createClient } from '@/lib/supabase/server'

export async function selectQuoteItem(quoteId: string, quoteItemId: string) {
  const supabase = await createClient()

  // desmarcar todos
  await supabase
    .from('quote_items')
    .update({ included: false })
    .eq('quote_id', quoteId)

  // marcar el seleccionado
  await supabase
    .from('quote_items')
    .update({ included: true })
    .eq('quote_item_id', quoteItemId)
}