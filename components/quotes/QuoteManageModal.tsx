
'use client'
import Modal from '@/components/ui/Modal'
import { useModal } from '@/app/providers/ModalProvider'

export default function QuoteManageModal({ quote }: any) {
  const { closeModal } = useModal()

  return (
    <Modal onClose={closeModal}>
      <h2>Gestionar cotización</h2>
      <p>{quote.folio} — {quote.client_name}</p>

      {quote.lines.map((line: any) => (
        <div key={line.id} className="card">
          <strong>{line.size}</strong>
          {line.items.map((item: any) => (
            <label key={item.id} className="row">
              <input type="radio" name={line.id} />
              <span>{item.brand} {item.model} – ${item.price}</span>
            </label>
          ))}
        </div>
      ))}

      <div className="actions">
        <button onClick={closeModal}>Cancelar</button>
        <button onClick={closeModal}>Aprobar</button>
      </div>
    </Modal>
  )
}
