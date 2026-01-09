
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateQuoteStatus(quoteId: string, status: 'APPROVED' | 'CANCELLED') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      status,
      approved_at: status === 'APPROVED' ? new Date().toISOString() : null,
      rejected_at: status === 'CANCELLED' ? new Date().toISOString() : null,
    })
    .eq('quote_id', quoteId)

  if (error) {
    throw new Error('No se pudo actualizar la cotización')
  }

  redirect('/admin/quotes')
}
