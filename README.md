FLUJO FINAL DE COTIZACIONES → TALLER

1. El vendedor marca quote_items.included = true
2. En /admin/quotes → Gestionar:
   - Se muestran SOLO included = true
   - El cliente elige UNA
3. Aprobar:
   - Guarda selected_quote_item_id
   - Crea orden OPEN
4. Cancelar:
   - Cambia status a CANCELLED

SUPABASE:
- No necesitas cambiar esquema
- Solo verificar columnas:
  quotes.status
  quote_lines.selected_quote_item_id
  quote_items.included