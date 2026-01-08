
'use client'
import Modal from '@/components/ui/Modal'
import { useModal } from '@/app/providers/ModalProvider'

export default function QuoteManageModal({ quote }: { quote: any }) {
  const { closeModal } = useModal()

  return (
    <Modal onClose={closeModal}>
      <h2>Gestionar cotización</h2>
      <p><strong>Folio:</strong> {quote?.folio}</p>
      <p><strong>Cliente:</strong> {quote?.client_name}</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button onClick={closeModal}>Cerrar</button>
      </div>
    </Modal>
  )
}
