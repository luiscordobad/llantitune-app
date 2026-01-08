
FIX NEXT.JS 15 COOKIES PROMISE

PROBLEMA:
cookies() ahora devuelve Promise<ReadonlyRequestCookies> en Next 15.

SOLUCIÓN:
- createClient() pasa a ser async
- await cookies()

ARCHIVO A REEMPLAZAR:
lib/supabase/server.ts
