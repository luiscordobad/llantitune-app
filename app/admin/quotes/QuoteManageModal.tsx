
'use client'
import { useEffect, useState } from 'react'
import Modal from '@/app/components/ui/Modal'

export default function QuoteManageModal({ open, quoteId, onClose, onDone }) {
  const [data,setData]=useState(null)
  const [selected,setSelected]=useState(null)

  useEffect(()=>{
    if(!open) return
    fetch(`/api/quotes/details?quote_id=${quoteId}`)
      .then(r=>r.json())
      .then(setData)
  },[open,quoteId])

  if(!open || !data) return null

  async function approve(){
    await fetch('/api/quotes/approve',{method:'POST',body:JSON.stringify({quoteId,quoteItemId:selected})})
    onDone()
    onClose()
  }

  async function cancel(){
    await fetch('/api/quotes/cancel',{method:'POST',body:JSON.stringify({quoteId})})
    onDone()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2>Cotización {data.quote.folio}</h2>
      {data.lines.map(line=>(
        <div key={line.id}>
          <h4>{line.measure} – Cantidad {line.quantity}</h4>
          {line.items.map(item=>(
            <label key={item.quote_item_id} style={{display:'block',marginBottom:8}}>
              <input type="radio" name={line.id}
                onChange={()=>setSelected(item.quote_item_id)} />
              {item.brand} {item.model} – ${item.price_each} (Stock {item.stock})
            </label>
          ))}
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:16}}>
        <button className="btn" onClick={cancel}>Cancelar cotización</button>
        <button className="btn btnPrimary" disabled={!selected} onClick={approve}>
          Aprobar y enviar a taller
        </button>
      </div>
    </Modal>
  )
}
