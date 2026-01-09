import { createClient } from '@/lib/supabase/server'

export async function getQuotes() {
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
    console.error('[getQuotes]', error)
    return []
  }

  return data ?? []
}
