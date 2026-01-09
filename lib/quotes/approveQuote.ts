
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function approveQuote(quoteId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    })
    .eq('quote_id', quoteId)
    .eq('status', 'SENT')

  if (error) {
    throw new Error('No se pudo aprobar la cotización')
  }

  redirect('/admin/quotes')
}
