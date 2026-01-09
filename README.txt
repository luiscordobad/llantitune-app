
PASO 2 — FIX NEXT.JS 15 (params async)

PROBLEMA:
Next 15 tipa params como Promise.

SOLUCIÓN:
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

ARCHIVOS:
- lib/quotes/getQuoteById.ts
- app/admin/quotes/[id]/page.tsx
