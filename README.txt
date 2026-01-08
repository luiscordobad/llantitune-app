
FIX DEFINITIVO NEXT.JS 15 PARAMS

PROBLEMA:
Next.js 15 tipa params como Promise en PageProps generados.

SOLUCIÓN:
- params se tipa como Promise<{ id: string }>
- Se hace await params dentro del page

ESTE ARCHIVO:
- app/admin/quotes/[id]/page.tsx

REEMPLAZA EL ARCHIVO Y VUELVE A BUILD.
