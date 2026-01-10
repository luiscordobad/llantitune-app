'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ApproveQuotePage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string

  useEffect(() => {
    async function approve() {
      try {
        // 1. Get quote details
        const quoteRes = await fetch(`/api/quotes/${quoteId}`)
        if (!quoteRes.ok) throw new Error('Failed to load quote')

        const quote = await quoteRes.json()

        const line = quote.lines?.[0]
        const selectedItemId = line?.selected_quote_item_id

        if (!line || !selectedItemId) {
          throw new Error('No selected quote item')
        }

        // 2. Approve quote
        const res = await fetch('/api/quotes/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            line_id: line.line_id,
            quote_item_id: selectedItemId
          })
        })

        if (!res.ok) throw new Error('Approval failed')

        router.push(`/admin/quotes/${quoteId}`)
      } catch (err) {
        console.error(err)
        alert('Error approving quote')
      }
    }

    approve()
  }, [quoteId, router])

  return <p>Aprobando cotización…</p>
}
