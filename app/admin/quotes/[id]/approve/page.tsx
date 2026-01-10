
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
        const q = await fetch(`/api/quotes/${quoteId}`)
        if (!q.ok) throw new Error()

        const quote = await q.json()
        const line = quote.lines?.[0]

        if (!line?.selected_quote_item_id) throw new Error()

        const res = await fetch('/api/quotes/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            line_id: line.line_id,
            quote_item_id: line.selected_quote_item_id
          })
        })

        if (!res.ok) throw new Error()

        router.push(`/admin/quotes/${quoteId}`)
      } catch {
        alert('Error approving quote')
      }
    }

    run()
  }, [quoteId, router])

  return <p>Aprobando cotización…</p>
}
