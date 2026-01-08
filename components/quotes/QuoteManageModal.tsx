
'use client'

import Modal from '@/components/ui/Modal'

interface QuoteManageModalProps {
  quoteId: string
  onClose: () => void
}

export default function QuoteManageModal({
  quoteId,
  onClose,
}: QuoteManageModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2>Gestionar cotización</h2>
      <p><strong>ID de cotización:</strong> {quoteId}</p>

      {/* Aquí después se cargan los datos reales con Supabase */}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}
