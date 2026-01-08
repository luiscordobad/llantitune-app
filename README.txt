
FIX DE TIPADO NEXT.JS APP ROUTER

PROBLEMA:
Next 15 espera que los Page Components sean async y usen PageProps correctamente.

SOLUCIÓN:
- page.tsx ahora es async
- Interface PageProps cumple el contrato esperado
- Ya no hay conflicto con Promise<any>

SOLO REEMPLAZA:
app/admin/quotes/[id]/page.tsx
