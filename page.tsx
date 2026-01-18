import Link from "next/link";
import { getQuotesPaged } from "@/lib/quotes/getQuotes";

function clampInt(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: { page?: string; pageSize?: string };
}) {
  const page = clampInt(searchParams?.page, 1, 1, 10_000);
  const pageSize = clampInt(searchParams?.pageSize, 25, 10, 100);

  const { rows: quotes, total } = await getQuotesPaged({ page, pageSize });

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  function pageHref(p: number) {
    return `/admin/quotes?page=${p}&pageSize=${pageSize}`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Cotizaciones</h1>

        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-80">
            Total: <b>{total ?? 0}</b>
          </span>

          <div className="flex items-center gap-2">
            <span className="opacity-80">Por página</span>
            <div className="flex items-center gap-1">
              {[10, 25, 50, 100].map((n) => (
                <Link
                  key={n}
                  href={`/admin/quotes?page=1&pageSize=${n}`}
                  className={`px-2 py-1 rounded border ${
                    n === pageSize ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Folio</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Vehículo</th>
              <th className="p-3">Estatus</th>
              <th className="p-3">Creada</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes?.length ? (
              quotes.map((q: any) => (
                <tr key={q.quote_id} className="border-t">
                  <td className="p-3 font-mono">{q.quote_number || q.quote_no || "—"}</td>
                  <td className="p-3">{q.customer_name || "—"}</td>
                  <td className="p-3">{q.vehicle_text || "—"}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-1 rounded border">
                      {q.status || "—"}
                    </span>
                  </td>
                  <td className="p-3">
                    {q.created_at ? new Date(q.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/quotes/${q.quote_id}`}
                      className="underline"
                    >
                      Gestionar
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-6 opacity-70" colSpan={6}>
                  No hay cotizaciones todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm opacity-80">
          Página <b>{page}</b> de <b>{totalPages}</b>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={pageHref(1)}
            className={`px-3 py-2 rounded border ${page === 1 ? "opacity-50 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            « Primero
          </Link>
          <Link
            href={pageHref(prevPage)}
            className={`px-3 py-2 rounded border ${page === 1 ? "opacity-50 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            ‹ Anterior
          </Link>
          <Link
            href={pageHref(nextPage)}
            className={`px-3 py-2 rounded border ${page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            Siguiente ›
          </Link>
          <Link
            href={pageHref(totalPages)}
            className={`px-3 py-2 rounded border ${page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            Último »
          </Link>
        </div>
      </div>
    </div>
  );
}
