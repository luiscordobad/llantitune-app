
'use server'

import { createClient } from '@/lib/supabase/server'

export async function selectQuoteItem(quoteId: string, itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      selected_quote_item_id: itemId,
    })
    .eq('quote_id', quoteId)
    .eq('status', 'SENT')

  if (error) {
    throw new Error('No se pudo guardar la selección de llanta')
  }
}
