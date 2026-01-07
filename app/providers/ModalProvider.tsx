
'use client'
import { createContext, useContext, useState } from 'react'

interface ModalContextType {
  openModal: (content: React.ReactNode) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<React.ReactNode | null>(null)

  return (
    <ModalContext.Provider value={{
      openModal: setContent,
      closeModal: () => setContent(null)
    }}>
      {children}
      {content}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error("useModal must be used inside ModalProvider")
  return ctx
}
