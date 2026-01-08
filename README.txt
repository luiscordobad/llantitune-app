
FIX DE SUPABASE SERVER CLIENT

PROBLEMA:
No existía el archivo:
lib/supabase/server.ts

SOLUCIÓN:
Se agrega el client server-side oficial para Next App Router.

REQUISITOS:
- Variables de entorno:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY

COPIAR:
lib/supabase/server.ts
