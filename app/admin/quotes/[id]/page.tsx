import { createClient } from '@/lib/supabase/server'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const id = params.id

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .eq('included', true)

  return (
    <div>
      <h1>Cotización #{quote?.quote_no}</h1>

      <h2>Seleccionar llanta</h2>

      {(!items || items.length === 0) && (
        <p>No hay opciones disponibles.</p>
      )}

      {items?.map(item => (
        <form key={item.quote_item_id} action={selectQuoteItem.bind(null, id, item.quote_item_id)}>
          <button type="submit">
            Seleccionar {item.brand} {item.model}
          </button>
        </form>
      ))}
    </div>
  )
}