
import { createClient } from '@/lib/supabase/server'

export type QuoteItem = {
  id: string
  brand: string | null
  model: string | null
  price: number | null
  stock: number | null
  included: boolean
}

export async function getQuoteItemsByQuoteId(quoteId: string): Promise<QuoteItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quote_items')
    .select(`
      id,
      brand,
      model,
      price,
      stock,
      included
    `)
    .eq('quote_id', quoteId)
    .eq('included', true)

  if (error) {
    console.error('[getQuoteItemsByQuoteId]', error)
    return []
  }

  return data ?? []
}
