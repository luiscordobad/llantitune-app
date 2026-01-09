
PASO 4 — FIX DE TIPOS

PROBLEMA:
selected_quote_item_id existía en BD pero no en el tipo QuoteDetail.

SOLUCIÓN:
- Agregar selected_quote_item_id al tipo
- Agregarlo al select de Supabase

ARCHIVO A REEMPLAZAR:
- lib/quotes/getQuoteById.ts
