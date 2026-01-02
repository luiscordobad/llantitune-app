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
