'use client'
import { useEffect, useState } from 'react'

export default function QuoteManageModal({ quoteId, onClose }: any) {
  const [data, setData] = useState<any>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
  }, [quoteId])

  if (!data || !data.quote) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 w-full max-w-2xl rounded">
        <h2 className="text-xl font-bold mb-4">
          Cotización {data.quote.folio}
        </h2>

        {data.lines.map((line: any) => (
          <div key={line.id} className="mb-4">
            <p className="font-semibold">
              {line.measure} – Cantidad {line.quantity}
            </p>

            {line.items.map((item: any) => (
              <label key={item.quote_item_id} className="block">
                <input
                  type="radio"
                  checked={selectedItemId === item.quote_item_id}
                  onChange={() => {
                    setSelectedItemId(item.quote_item_id)
                    setSelectedLineId(line.id)
                  }}
                />
                {' '}
                {item.brand} {item.model} – ${item.price_each} (Stock {item.stock})
              </label>
            ))}
          </div>
        ))}

        <div className="flex justify-between mt-6">
          <button
            className="text-red-600"
            onClick={async () => {
              await fetch('/api/quotes/cancel', {
                method: 'POST',
                body: JSON.stringify({ quote_id: data.quote.id })
              })
              onClose()
            }}
          >
            Cancelar cotización
          </button>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={async () => {
              if (!selectedItemId || !selectedLineId) {
                alert('Selecciona una llanta o cancela la cotización')
                return
              }

              await fetch('/api/quotes/approve', {
                method: 'POST',
                body: JSON.stringify({
                  quote_id: data.quote.id,
                  line_id: selectedLineId,
                  quote_item_id: selectedItemId
                })
              })
              onClose()
            }}
          >
            Aprobar y enviar a taller
          </button>
        </div>
      </div>
    </div>
  )
}