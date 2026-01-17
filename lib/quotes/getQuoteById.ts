
import { createClient } from '@/lib/supabase/server'

export async function getQuoteById(quoteId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', quoteId)
    .single()

  if (error) throw error
  return data
}
