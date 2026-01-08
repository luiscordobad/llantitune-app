
ZIP: LISTADO REAL DE COTIZACIONES

PROBLEMA:
El listado de /admin/quotes seguía usando dummies.

SOLUCIÓN:
- Se agrega getPendingQuotes()
- /admin/quotes/page.tsx ahora es Server Component
- Trae cotizaciones reales con status PENDING

ARCHIVOS:
1) lib/quotes/getPendingQuotes.ts
2) app/admin/quotes/page.tsx

REEMPLAZAR ambos.

REQUISITOS:
- Tabla quotes con columna status
- Valores: PENDING / APPROVED / CANCELLED
