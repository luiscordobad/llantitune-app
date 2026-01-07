
'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useModal } from '@/app/providers/ModalProvider'

interface QuoteItem {
  id: string
  brand: string
  model: string
  price: number
  stock: number
}

interface QuoteLine {
  id: string
  size: string
  items: QuoteItem[]
}

interface Quote {
  id: string
  folio: string
  client_name: string
  lines: QuoteLine[]
}

export default function QuoteManageModal({ quote, onApproved }: { quote: Quote, onApproved: () => void }) {
  const { closeModal } = useModal()
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function selectItem(lineId: string, itemId: string) {
    setSelected(prev => ({ ...prev, [lineId]: itemId }))
  }

  async function approveQuote() {
    setLoading(true)
    onApproved()
    closeModal()
  }

  async function cancelQuote() {
    setLoading(true)
    onApproved()
    closeModal()
  }

  return (
    <Modal onClose={closeModal}>
      <h2>Gestionar cotización</h2>
      <p><strong>Folio:</strong> {quote.folio}</p>
      <p><strong>Cliente:</strong> {quote.client_name}</p>
      <hr />
      {quote.lines.map(line => (
        <div key={line.id}>
          <h4>{line.size}</h4>
          {line.items.map(item => (
            <label key={item.id} style={{ display:'flex', gap:12 }}>
              <input type="radio" name={line.id} checked={selected[line.id]===item.id}
                onChange={() => selectItem(line.id, item.id)} />
              <span>{item.brand} {item.model} - ${item.price}</span>
            </label>
          ))}
        </div>
      ))}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
        <button onClick={cancelQuote} disabled={loading}>Cancelar</button>
        <button onClick={approveQuote} disabled={loading}>Aprobar</button>
      </div>
    </Modal>
  )
}
