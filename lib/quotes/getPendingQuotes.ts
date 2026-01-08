
import { createClient } from '@/lib/supabase/server'

export async function getPendingQuotes() {
  try {
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
      console.error('[getPendingQuotes]', error)
      return []
    }

    return data ?? []
  } catch (e) {
    console.error('[getPendingQuotes] fatal', e)
    return []
  }
}
