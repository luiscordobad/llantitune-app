
RUNTIME FIX /admin/quotes

PROBLEMA:
La página fallaba en runtime por errores de Supabase (RLS, env vars, etc.).

SOLUCIÓN:
- getPendingQuotes ya NO lanza errores (no throw)
- Manejo defensivo: devuelve []
- La página renderiza mensaje amigable en vez de crashear

ARCHIVOS A REEMPLAZAR:
- lib/quotes/getPendingQuotes.ts
- app/admin/quotes/page.tsx

NOTA:
Revisa también en Supabase:
- RLS habilitado
- Policy de SELECT para quotes
- Variables de entorno en Vercel
