import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient() // ✅ FIX CLAVE

  // 1️⃣ Obtener cotización
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  if (!quote) {
    notFound()
  }

  // 2️⃣ Obtener llantas cotizadas (quote_items)
  const { data: items = [] } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .eq('included', true)
    .order('rank')

  // 3️⃣ Action para seleccionar llanta
  async function selectItem(formData: FormData) {
    'use server'
    const selectedId = formData.get('selected_item') as string
    const supabase = await createClient() // ✅ FIX TAMBIÉN AQUÍ

    await supabase
      .from('quotes')
      .update({ selected_quote_item_id: selectedId })
      .eq('quote_id', id)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <a href="/admin/quotes" className="text-sm text-muted hover:underline">
        ← Volver a cotizaciones
      </a>

      <div>
        <h1 className="text-2xl font-semibold">
          Cotización #{quote.quote_no}
        </h1>
        <p className="text-sm text-muted">
          Cliente: {quote.customer_name || '—'}
        </p>
        <p className="text-sm text-muted">
          Status: {quote.status}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">
          Seleccionar llanta
        </h2>

        {items.length === 0 ? (
          <p className="text-sm text-muted">
            No hay opciones disponibles.
          </p>
        ) : (
          <form action={selectItem} className="space-y-3">
            {items.map(item => (
              <label
                key={item.quote_item_id}
                className="block border rounded p-4 cursor-pointer hover:bg-muted"
              >
                <div className="flex gap-3 items-start">
                  <input
                    type="radio"
                    name="selected_item"
                    value={item.quote_item_id}
                    defaultChecked={
                      quote.selected_quote_item_id === item.quote_item_id
                    }
                  />

                  <div className="flex-1">
                    <p className="font-medium">
                      {item.brand} – {item.model}
                    </p>
                    <p className="text-sm text-muted">
                      {item.size} · {item.load_speed}
                    </p>
                    <p className="text-sm">
                      Total:{' '}
                      <strong>
                        ${item.total_with_services.toLocaleString()}
                      </strong>
                    </p>
                  </div>
                </div>
              </label>
            ))}

            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded bg-black text-white text-sm"
            >
              Guardar selección
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
