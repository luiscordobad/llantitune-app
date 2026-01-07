
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
      <p className="subtitle">
        Selecciona la opción por medida antes de aprobar
      </p>

      <p><strong>Folio:</strong> {quote.folio}</p>
      <p><strong>Cliente:</strong> {quote.client_name}</p>

      {quote.lines.map((line: any) => (
        <div key={line.id} style={{ marginTop: 28 }}>
          <h4>{line.size}</h4>

          {line.items.map((item: any) => (
            <label
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                gap: 14,
                marginTop: 12,
                cursor: 'pointer'
              }}
            >
              <input type="radio" name={line.id} />
              <div>
                <div><strong>{item.brand} {item.model}</strong></div>
                <div style={{ color: '#6b7280' }}>
                  ${item.price} · Stock {item.stock}
                </div>
              </div>
            </label>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 32 }}>
        <button className="secondary" onClick={closeModal}>
          Cancelar
        </button>
        <button onClick={closeModal}>
          Aprobar y enviar a taller
        </button>
      </div>
    </Modal>
  )
}
