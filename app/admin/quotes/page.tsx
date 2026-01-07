
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
      created_at: '6 Ene 2024',
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
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1>Cotizaciones pendientes</h1>
      <p className="subtitle">
        Revisa y aprueba cotizaciones antes de enviarlas al taller
      </p>

      <div className="list">
        {quotes.map(q => (
          <div key={q.id} className="list-item">
            <div>
              <strong>{q.folio}</strong><br />
              <span style={{ color: '#6b7280' }}>
                {q.client_name} · {q.created_at}
              </span>
            </div>

            <button
              onClick={() =>
                openModal(
                  <QuoteManageModal
                    quote={q}
                    onApproved={() => {}}
                  />
                )
              }
            >
              Gestionar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
