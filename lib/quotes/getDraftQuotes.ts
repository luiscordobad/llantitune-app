
import { createClient } from '@/lib/supabase/server'

export type DraftQuote = {
  quote_id: string
  quote_no: number | null
  customer_name: string | null
  customer_phone: string | null
  vehicle_text: string | null
  size: string | null
  quantity: number | null
  status: string
  created_at: string
}

export async function getDraftQuotes(): Promise<DraftQuote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      quote_id,
      quote_no,
      customer_name,
      customer_phone,
      vehicle_text,
      size,
      quantity,
      status,
      created_at
    `)
    .eq('status', 'DRAFT')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDraftQuotes]', error)
    return []
  }

  return data ?? []
}
