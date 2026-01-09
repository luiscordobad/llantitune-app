
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function markQuoteSent(quoteId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'SENT',
      sent_at: new Date().toISOString(),
    })
    .eq('quote_id', quoteId)
    .eq('status', 'DRAFT')

  if (error) {
    throw new Error('No se pudo marcar la cotización como enviada')
  }

  redirect('/admin/quotes')
}
