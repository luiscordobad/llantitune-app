import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getQuotes() {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .in('status', ['DRAFT', 'SENT'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data ?? []
}