
'use client'
import { useModal } from '@/app/providers/ModalProvider'
import QuoteManageModal from '@/components/quotes/QuoteManageModal'

export default function QuotesPage() {
  const { openModal } = useModal()

  const quotes = [
    {
      id: '1',
      folio: 'Q-1001',
      client_name: 'Juan Pérez',
      created_at: '2024-01-06',
      lines: [
        {
          id: 'l1',
          size: '215/55R16',
          items: [
            { id: 'i1', brand: 'Michelin', model: 'Primacy', price: 2800, stock: 4 },
            { id: 'i2', brand: 'Continental', model: 'Eco', price: 2500, stock: 2 },
          ],
        },
      ],
    },
  ]

  return (
    <div className="container">
      <h1>Cotizaciones</h1>
      <div className="card">
        {quotes.map(q => (
          <div key={q.id} className="row">
            <div>
              <strong>{q.folio}</strong><br />
              <span>{q.client_name}</span>
            </div>
            <button onClick={() => openModal(<QuoteManageModal quote={q} />)}>
              Gestionar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
