
'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useModal } from '@/app/providers/ModalProvider'

export default function QuoteManageModal({ quote, onApproved }: any) {
  const { closeModal } = useModal()
  const [selected, setSelected] = useState({})

  return (
    <Modal onClose={closeModal}>
      <h2>Gestionar cotización</h2>
      <p><strong>Folio:</strong> {quote.folio}</p>
      <p><strong>Cliente:</strong> {quote.client_name}</p>

      {quote.lines.map((line: any) => (
        <div key={line.id} style={{ marginTop: 20 }}>
          <h4>{line.size}</h4>
          {line.items.map((item: any) => (
            <label
              key={item.id}
              className="card"
              style={{ display: 'flex', gap: 12, marginBottom: 12 }}
            >
              <input type="radio" name={line.id} />
              <div>{item.brand} {item.model} – ${item.price}</div>
            </label>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="secondary" onClick={closeModal}>Cancelar</button>
        <button onClick={closeModal}>Aprobar</button>
      </div>
    </Modal>
  )
}
