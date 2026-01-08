
import { createClient } from '@/lib/supabase/server'

export async function getQuoteById(quoteId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id,
      folio,
      client_name,
      status,
      quote_lines (
        id,
        size,
        quote_items (
          id,
          brand,
          model,
          price,
          stock,
          included
        )
      )
    `)
    .eq('id', quoteId)
    .single()

  if (error) {
    console.error(error)
    throw new Error('No se pudo cargar la cotización')
  }

  return data
}
