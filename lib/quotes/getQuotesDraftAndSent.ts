
import { createClient } from '@/lib/supabase/server'

export type QuoteRow = {
  quote_id: string
  quote_no: number | null
  customer_name: string | null
  customer_phone: string | null
  vehicle_text: string | null
  size: string | null
  quantity: number | null
  status: 'DRAFT' | 'SENT'
  created_at: string
}

export async function getQuotesDraftAndSent(): Promise<QuoteRow[]> {
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
    .in('status', ['DRAFT', 'SENT'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getQuotesDraftAndSent]', error)
    return []
  }

  return data ?? []
}
