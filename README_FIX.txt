
FIX APLICADO:

- QuoteManageModal ahora recibe:
  - quoteId: string
  - onClose: () => void

Esto coincide con:
<QuoteManageModal quoteId={activeQuoteId} onClose={...} />

No más error de TypeScript.
