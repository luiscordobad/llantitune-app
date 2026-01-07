'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function QuoteManageModal({
  quoteId,
  onClose
}: {
  quoteId: string
  onClose: () => void
}) {
  const [data, setData] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
  }, [quoteId])

  if (!mounted) return null

  return createPortal(
    <div style={overlay}>
      <div style={modal}>
        {!data && <p>Cargando…</p>}

        {data && (
          <>
            <header style={header}>
              <h2>Gestionar cotización {data.quote.folio}</h2>
              <button onClick={onClose}>✕</button>
            </header>

            {data.lines.map((line: any) => (
              <div key={line.id}>
                <strong>{line.measure} · Cantidad {line.quantity}</strong>

                {line.items.map((item: any) => (
                  <label key={item.quote_item_id} style={option}>
                    <input
                      type="radio"
                      name={line.id}
                      checked={selectedItemId === item.quote_item_id}
                      onChange={() => {
                        setSelectedItemId(item.quote_item_id)
                        setSelectedLineId(line.id)
                      }}
                    />
                    {item.brand} {item.model} – ${item.price_each}
                  </label>
                ))}
              </div>
            ))}

            <footer style={footer}>
              <button onClick={onClose}>Cerrar</button>
              <button
                onClick={async () => {
                  if (!selectedItemId || !selectedLineId) {
                    alert('Selecciona una llanta')
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
                Aprobar
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
} as const

const modal = {
  background: '#fff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 720,
  padding: 24
} as const

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 16
} as const

const option = {
  display: 'block',
  marginTop: 8
} as const

const footer = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 24
} as const
