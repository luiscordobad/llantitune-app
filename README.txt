
ZIP: DATOS REALES DE COTIZACIONES

INCLUYE:
1) lib/quotes/getQuoteById.ts
   - Fetch server-side desde Supabase
   - Trae quote, lines e items

2) app/admin/quotes/[id]/page.tsx
   - Usa getQuoteById
   - Renderiza datos reales
   - Mantiene redirect al aprobar/cancelar

COPIAR:
- lib/
- app/

REEMPLAZAR ARCHIVOS EXISTENTES.

REQUISITOS:
- Supabase configurado en lib/supabase/server.ts
- Tablas: quotes, quote_lines, quote_items
