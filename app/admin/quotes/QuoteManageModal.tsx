
'use client'
import { useEffect, useState } from 'react'
import Modal from '@/app/components/ui/Modal'

interface QuoteManageModalProps {
  open: boolean
  quoteId: string | null
  onClose: () => void
  onDone: () => void
}

interface QuoteItem {
  quote_item_id: string
  brand: string
  model: string
  price_each: number
  stock: number
}

interface QuoteLine {
  id: string
  measure: string
  quantity: number
  items: QuoteItem[]
}

interface QuoteDetails {
  quote: {
    folio: string
  }
  lines: QuoteLine[]
}

export default function QuoteManageModal({
  open,
  quoteId,
  onClose,
  onDone,
}: QuoteManageModalProps) {
  const [data, setData] = useState<QuoteDetails | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !quoteId) return
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
  }, [open, quoteId])

  if (!open || !quoteId || !data) return null

  async function approve() {
    await fetch('/api/quotes/approve', {
      method: 'POST',
      body: JSON.stringify({ quoteId, quoteItemId: selected }),
    })
    onDone()
    onClose()
  }

  async function cancel() {
    await fetch('/api/quotes/cancel', {
      method: 'POST',
      body: JSON.stringify({ quoteId }),
    })
    onDone()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2>Cotización {data.quote.folio}</h2>

      {data.lines.map(line => (
        <div key={line.id} style={{ marginBottom: 16 }}>
          <h4>{line.measure} – Cantidad {line.quantity}</h4>
          {line.items.map(item => (
            <label key={item.quote_item_id} style={{ display: 'block', marginBottom: 6 }}>
              <input
                type="radio"
                name={line.id}
                onChange={() => setSelected(item.quote_item_id)}
              />{' '}
              {item.brand} {item.model} – ${item.price_each} (Stock {item.stock})
            </label>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn" onClick={cancel}>Cancelar cotización</button>
        <button
          className="btn btnPrimary"
          disabled={!selected}
          onClick={approve}
        >
          Aprobar y enviar a taller
        </button>
      </div>
    </Modal>
  )
}
