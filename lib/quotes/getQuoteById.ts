
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export type QuoteDetail = {
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

export async function getQuoteById(quoteId: string): Promise<QuoteDetail> {
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
    .eq('quote_id', quoteId)
    .single()

  if (error || !data) {
    console.error('[getQuoteById]', error)
    notFound()
  }

  return data
}
