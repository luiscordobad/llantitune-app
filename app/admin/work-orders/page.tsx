import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function WorkOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('work_orders')
    .select(`
      id,
      status,
      created_at,
      quotes (
        quote_no,
        customer_name
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1>Órdenes de trabajo</h1>

      {!orders || orders.length === 0 ? (
        <p>No hay órdenes todavía.</p>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const quote = Array.isArray(order.quotes)
                ? order.quotes[0]
                : order.quotes

              return (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/work-orders/${order.id}`}>
                      {order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td>{quote?.customer_name ?? '-'}</td>
                  <td>{order.status}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}