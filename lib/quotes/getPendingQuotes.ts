
import { createClient } from '@/lib/supabase/server'

export async function getPendingQuotes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('id, folio, client_name, status, created_at')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    throw new Error('No se pudieron cargar las cotizaciones')
  }

  return data
}
