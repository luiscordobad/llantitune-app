
'use client'
import { useModal } from '@/app/providers/ModalProvider'
import Modal from '@/components/ui/Modal'

export default function QuotesPage() {
  const { openModal, closeModal } = useModal()

  return (
    <div>
      <h1>Cotizaciones pendientes</h1>
      <button
        onClick={() =>
          openModal(
            <Modal onClose={closeModal}>
              <h2>Gestionar cotización</h2>
              <p>Contenido real del modal aquí</p>
              <button onClick={closeModal}>Cerrar</button>
            </Modal>
          )
        }
      >
        Gestionar
      </button>
    </div>
  )
}
