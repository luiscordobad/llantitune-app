
import { createClient } from '@/lib/supabase/server'

export async function getPendingQuotes() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('quotes')
      .select('id, folio, client_name, status, created_at')
      .eq('status', 'PENDING')
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
