
'use client'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function Modal({ open, onClose, children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(()=>setMounted(true),[])
  if(!mounted || !open) return null

  return createPortal(
    <div style={{
      position:'fixed',
      inset:0,
      background:'rgba(15,23,42,0.45)',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      zIndex:9999
    }}>
      <div style={{
        background:'#fff',
        borderRadius:16,
        width:'min(900px,95vw)',
        maxHeight:'90vh',
        overflow:'auto',
        padding:24
      }}>
        {children}
        <div style={{textAlign:'right', marginTop:16}}>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
