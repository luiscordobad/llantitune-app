
FIX SUPABASE AWAIT CLIENT

PROBLEMA:
createClient() ahora es async y devolvía Promise<SupabaseClient>.
Se estaba usando sin await.

SOLUCIÓN:
const supabase = await createClient()

ARCHIVO A REEMPLAZAR:
lib/quotes/getQuoteById.ts
