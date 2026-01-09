
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function selectQuoteItem(quoteId: string, quoteItemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      selected_quote_item_id: quoteItemId,
    })
    .eq('quote_id', quoteId)

  if (error) {
    throw new Error('No se pudo seleccionar la llanta')
  }

  redirect(`/admin/quotes/${quoteId}`)
}
