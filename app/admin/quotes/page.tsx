
import Link from 'next/link'
import { getQuotes } from '@/lib/quotes/getQuotes'

export default async function QuotesPage() {
  const quotes = await getQuotes()

  return (
    <div>
      <h1>Cotizaciones</h1>
      <table>
        <tbody>
          {quotes.map((quote: any) => (
            <tr key={quote.quote_id}>
              <td>{quote.customer_name}</td>
              <td>{quote.status}</td>
              <td>
                <Link href={`/admin/quotes/${quote.quote_id}`}>
                  Gestionar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
