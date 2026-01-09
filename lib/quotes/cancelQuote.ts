
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function cancelQuote(quoteId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'CANCELLED',
      rejected_at: new Date().toISOString(),
    })
    .eq('quote_id', quoteId)
    .eq('status', 'SENT')

  if (error) {
    throw new Error('No se pudo cancelar la cotización')
  }

  redirect('/admin/quotes')
}
