
PASO 6 — ENVIAR COTIZACIÓN AL CLIENTE (DRAFT -> SENT)

Este paso:
- NO aprueba
- NO crea orden
- Solo marca la cotización como enviada

Incluye:
- Guardar selected_quote_item_id (opcional)
- Cambiar status a SENT
- Guardar sent_at
- Bloquear edición después de enviar

Archivos:
- lib/quotes/markQuoteSent.ts
- app/admin/quotes/[id]/page.tsx
