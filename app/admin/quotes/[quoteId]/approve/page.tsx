
'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ApproveQuotePage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.quoteId as string

  useEffect(() => {
    async function approve() {
      try {
        const res = await fetch('/api/quotes/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            line_id: null,
            quote_item_id: null
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
