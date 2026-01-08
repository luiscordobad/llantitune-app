
FIX DEFINITIVO: COLUMNAS REALES DE QUOTES

PROBLEMA:
El código asumía columnas incorrectas (id, folio, client_name).

TABLA REAL:
- quote_id (PK)
- quote_no
- customer_name

SOLUCIÓN:
- Ajustar SELECT a columnas reales
- Ajustar render al esquema real

ARCHIVOS A REEMPLAZAR:
- lib/quotes/getPendingQuotes.ts
- app/admin/quotes/page.tsx
