
PASO 3 — APROBAR / CANCELAR COTIZACIÓN

OBJETIVO:
- Aprobar o cancelar cotización DRAFT
- Cambia status en BD
- Redirige a /admin/quotes
- Desaparece del listado

ARCHIVOS:
- lib/quotes/updateQuoteStatus.ts
- app/admin/quotes/[id]/page.tsx

CHECKPOINT:
- Click Aprobar -> status APPROVED
- Click Cancelar -> status CANCELLED
- Redirect correcto
