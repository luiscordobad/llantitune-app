
'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ApproveQuotePage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string

  useEffect(() => {
    async function run() {
      try {
        // Correct API endpoint
        const q = await fetch(`/api/quote/${quoteId}`)
        if (!q.ok) throw new Error('Quote not found')

        const quote = await q.json()
        const line = quote.lines?.[0]

        if (!line?.selected_quote_item_id) {
          throw new Error('No selected quote item')
        }

        const res = await fetch('/api/quotes/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            line_id: line.line_id,
            quote_item_id: line.selected_quote_item_id
          })
        })

        if (!res.ok) throw new Error('Approve failed')

        router.push(`/admin/quotes/${quoteId}`)
      } catch (err) {
        console.error(err)
        alert('Error approving quote')
      }
    }

    run()
  }, [quoteId, router])

  return <p>Aprobando cotización…</p>
}
