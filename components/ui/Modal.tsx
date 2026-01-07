
'use client'
import { createPortal } from 'react-dom'

export default function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  const root = document.getElementById('modal-root')
  if (!root) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    root
  )
}
