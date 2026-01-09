import { createClient } from '@/lib/supabase/server'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const id = params.id

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  const isSent = quote?.status === 'SENT'

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('rank')

  async function saveSelection(formData: FormData) {
    'use server'
    if (!isSent) return
    const selected = formData.get('selected_item') as string | null
    if (!selected) return
    await selectQuoteItem(id, selected)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Cotización #{quote?.quote_no}</h1>

      <form action={saveSelection}>
        {items?.map(item => (
          <label key={item.quote_item_id} style={{ display: 'block', marginBottom: 12 }}>
            <input
              type="radio"
              name="selected_item"
              value={item.quote_item_id}
              defaultChecked={quote?.selected_quote_item_id === item.quote_item_id}
              disabled={!isSent}
            />
            {item.brand} {item.model} — ${item.total_with_services}
          </label>
        ))}

        {isSent && (
          <button type="submit" style={{ marginTop: 16 }}>
            Guardar selección
          </button>
        )}
      </form>
    </div>
  )
}