import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('rank')

  const isSent = quote?.status === 'SENT'
  const hasSelectedItem = items?.some(i => i.included)

  async function saveSelection(formData: FormData) {
    'use server'
    if (!isSent) return
    const selected = formData.get('selected_item') as string | null
    if (!selected) return
    await selectQuoteItem(id, selected)
    redirect(`/admin/quotes/${id}/approve`)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Cotización #{quote?.quote_no}</h1>

      <form action={saveSelection}>
        {items?.map(item => (
          <label key={item.quote_item_id} style={{ display: 'block', marginBottom: 12, opacity: hasSelectedItem && !item.included ? 0.5 : 1 }}>
            <input
              type="radio"
              name="selected_item"
              value={item.quote_item_id}
              defaultChecked={item.included === true}
              disabled={!isSent || (hasSelectedItem && !item.included)}
            />
            {item.brand} {item.model} — ${item.total_with_services}
          </label>
        ))}

        {isSent && !hasSelectedItem && (
          <button type="submit" style={{ marginTop: 16 }}>
            Guardar selección
          </button>
        )}
      </form>

      {isSent && hasSelectedItem && (
        <p style={{ marginTop: 16, color: '#555' }}>
          Llanta seleccionada. Continúa para aprobar la cotización.
        </p>
      )}
    </div>
  )
}