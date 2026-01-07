
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
    <div className="card">
      <h1>Cotizaciones pendientes</h1>

      <table className="table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => (
            <tr key={q.id}>
              <td>{q.folio}</td>
              <td>{q.client_name}</td>
              <td>{q.created_at}</td>
              <td>
                <button onClick={() => openModal(<QuoteManageModal quote={q} onApproved={() => {}} />)}>
                  Gestionar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
