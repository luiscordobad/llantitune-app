import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApproveQuotePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  async function approve() {
    'use server'
    await supabase
      .from('quotes')
      .update({ status: 'APPROVED' })
      .eq('quote_id', id)

    await supabase.from('work_orders').insert({
      quote_id: id,
      customer_id: quote.customer_id,
      status: 'OPEN',
    })

    redirect('/admin/work-orders')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1>Aprobar cotización #{quote?.quote_no}</h1>
      <p>Esto generará una orden de trabajo.</p>
      <form action={approve}>
        <button style={{ marginTop: 24 }}>
          Confirmar aprobación
        </button>
      </form>
    </div>
  )
}