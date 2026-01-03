# Llantitune – Cotizador (Next.js + Supabase + Vercel)

## Qué hace
- /admin/import: subes 3 excels (Prodynamics, Cotizador, INV), se normalizan con tus reglas y se guardan en Supabase.
- /quote: cotizas por tamaño + cantidad, muestra opciones, genera texto para WhatsApp, borrador para email (mailto) y PDF.

## Variables de entorno (Vercel)
Server:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Client:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Cómo correr local (opcional)
```bash
npm install
npm run dev
```


Note: TireID uses SHA-256 (first 12 hex) for deterministic IDs.


## Supabase migration (multi-size quotes)
Run `supabase_migrations/002_quote_lines.sql` in Supabase SQL Editor.


## Supabase migration (customers + quote number)
Run `supabase_migrations/003_customers_and_quote_no.sql` in Supabase SQL Editor.
