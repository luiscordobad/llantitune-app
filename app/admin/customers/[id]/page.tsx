'use client'

import { useState } from 'react'
import QuoteManagePanel from '@/components/QuoteManagePanel'

export default function CustomerDetailPage() {
  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null)

  return (
    <div>
      <h2>Detalle de cliente</h2>

      {/* Contenido del cliente aquí */}

      {manageQuoteId && (
        <QuoteManagePanel
          open={true}
          quoteId={manageQuoteId}
          onClose={() => setManageQuoteId(null)}
        />
      )}
    </div>
  )
}
