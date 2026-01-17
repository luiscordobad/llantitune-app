'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function QuoteManageModal({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
  }, [quoteId])

  return createPortal(
    <div style={overlay}>
      <div style={modal}>
        {!data && <p>Cargando…</p>}

        {data && (
          <>
            <header style={header}>
              <div>
                <h3>Cotización {data.quote.folio}</h3>
                <p style={{ opacity: 0.6 }}>{data.quote.customer.name}</p>
              </div>
              <button onClick={onClose} style={closeBtn}>✕</button>
            </header>

            {data.lines.map((line: any) => (
              <div key={line.id} style={{ marginBottom: 16 }}>
                <b>{line.measure}</b> · Cantidad {line.quantity}
                <div>
                  {line.items.map((item: any) => (
                    <label key={item.quote_item_id} style={option}>
                      <input type="radio" name={line.id} />
                      {item.brand} {item.model} – ${item.price_each} (Stock {item.stock})
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <footer style={footer}>
              <button className="btn" onClick={onClose}>Cerrar</button>
              <button className="btn btnPrimary">Aprobar</button>
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
  background: 'rgba(0,0,0,.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
} as const

const modal = {
  background: '#fff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 640,
  padding: 24
} as const

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 16
} as const

const closeBtn = {
  border: 'none',
  background: 'transparent',
  fontSize: 18,
  cursor: 'pointer'
} as const

const option = {
  display: 'block',
  marginTop: 6
} as const

const footer = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 24
} as const
