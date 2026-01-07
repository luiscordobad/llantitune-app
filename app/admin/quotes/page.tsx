
'use client'
import { useModal } from '@/app/providers/ModalProvider'
import QuoteManageModal from '@/components/quotes/QuoteManageModal'

export default function QuotesPage() {
  const { openModal } = useModal()

  const quotes = [
    {
      id:'1',
      folio:'Q-1001',
      client_name:'Juan Pérez',
      lines:[
        { id:'l1', size:'215/55R16', items:[
          { id:'i1', brand:'Michelin', model:'Primacy', price:2800, stock:4 },
          { id:'i2', brand:'Continental', model:'Eco', price:2500, stock:2 }
        ]}
      ]
    }
  ]

  return (
    <div>
      <h1>Cotizaciones pendientes</h1>
      {quotes.map(q => (
        <div key={q.id}>
          {q.folio} - {q.client_name}
          <button onClick={() => openModal(<QuoteManageModal quote={q} onApproved={() => {}} />)}>
            Gestionar
          </button>
        </div>
      ))}
    </div>
  )
}
