
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function QuoteManagePage({ params }: PageProps) {
  const { id: quoteId } = await params

  async function approveQuote() {
    'use server'
    redirect('/admin/quotes')
  }

  async function cancelQuote() {
    'use server'
    redirect('/admin/quotes')
  }

  return (
    <div>
      <h1>Gestionar cotización</h1>

      <p>
        <strong>ID de cotización:</strong> {quoteId}
      </p>

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <form action={cancelQuote}>
          <button type="submit">Cancelar</button>
        </form>

        <form action={approveQuote}>
          <button type="submit">Aprobar</button>
        </form>
      </div>
    </div>
  )
}
