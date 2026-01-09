import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('work_orders')
    .select(`
      id,
      status,
      created_at,
      quote_id,
      quotes (
        quote_no,
        customer_name,
        customer_phone,
        vehicle_text
      )
    `)
    .eq('id', id)
    .single()

  const quote = Array.isArray(order?.quotes) ? order?.quotes[0] : order?.quotes

  const { data: item } = quote
    ? await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', order.quote_id)
        .eq('included', true)
        .single()
    : { data: null }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1>Orden de trabajo</h1>

      <h2>Cliente</h2>
      <p>{quote?.customer_name ?? '-'}</p>
      <p>{quote?.customer_phone ?? '-'}</p>

      <h2>Vehículo</h2>
      <p>{quote?.vehicle_text ?? '-'}</p>

      <h2>Llanta seleccionada</h2>
      {item ? (
        <p>
          {item.brand} {item.model} — ${item.total_with_services}
        </p>
      ) : (
        <p>No hay llanta asociada.</p>
      )}

      <h2>Status</h2>
      <p>{order?.status}</p>
    </div>
  )
}