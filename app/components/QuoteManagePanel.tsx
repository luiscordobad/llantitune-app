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
              <div>
                <h2>Gestionar cotización {data.quote.folio}</h2>
                <p style={{ opacity: 0.7 }}>
                  {data.quote.customer.name}
                </p>
              </div>
              <button onClick={onClose} style={closeBtn}>✕</button>
            </header>

            {data.lines.map((line: any) => (
              <div key={line.id} style={{ marginBottom: 20 }}>
                <strong>
                  Medida {line.measure} · Cantidad {line.quantity}
                </strong>

                <div style={{ marginTop: 8 }}>
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
                      <span>
                        <b>{item.brand}</b> {item.model}
                      </span>
                      <span>
                        ${item.price_each} · Stock {item.stock}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <footer style={footer}>
              <button
                style={cancelBtn}
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
                style={approveBtn}
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
                Aprobar y enviar a taller
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ====== estilos ====== */

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
  padding: 24,
  boxShadow: '0 20px 40px rgba(0,0,0,.25)'
} as const

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 16
} as const

const closeBtn = {
  border: 'none',
  background: 'transparent',
  fontSize: 22,
  cursor: 'pointer'
} as const

const option = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: 8,
  borderRadius: 6,
  cursor: 'pointer'
} as const

const footer = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 24
} as const

const cancelBtn = {
  background: '#dc2626',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer'
} as const

const approveBtn = {
  background: '#2563eb',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer'
} as const
