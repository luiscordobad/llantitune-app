'use client'
import { useEffect, useState } from 'react'

export default function QuoteManageModal({ quoteId, onClose }: any) {
  const [data, setData] = useState<any>(null)
  const [selected, setSelected] = useState<any>({})

  useEffect(() => {
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
  }, [quoteId])

  if (!data) return null

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
              <label key={item.id} className="block">
                <input
                  type="radio"
                  name={line.id}
                  checked={selected[line.id] === item.id}
                  onChange={() =>
                    setSelected((s: any) => ({
                      ...s,
                      [line.id]: item.id
                    }))
                  }
                />
                {' '}
                {item.brand} {item.model} – ${item.price} (Stock {item.stock})
              </label>
            ))}
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancelar</button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={async () => {
              await fetch('/api/quotes/approve', {
                method: 'POST',
                body: JSON.stringify({
                  quote_id: quoteId,
                  selections: Object.entries(selected).map(
                    ([lineId, itemId]) => ({
                      quote_line_id: lineId,
                      quote_item_id: itemId
                    })
                  )
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