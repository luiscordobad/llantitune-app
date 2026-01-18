import Link from "next/link";

import { getQuotesPaged } from "@/lib/quotes/getQuotes";

type SP = Record<string, string | string[] | undefined>;

function toInt(v: unknown, fallback: number) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : fallback;
}

export default async function QuotesPage(props: any) {
  // Next.js 15 may pass `searchParams` as a Promise depending on typings.
  const sp: SP = await Promise.resolve((props?.searchParams ?? {}) as any);

  const page = Math.max(1, toInt(sp.page, 1));
  const pageSize = Math.min(100, Math.max(5, toInt(sp.pageSize, 20)));

  const { rows: quotes, total, page: currentPage, pageSize: currentPageSize } =
    await getQuotesPaged({ page, pageSize });

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const mkUrl = (p: number, ps = currentPageSize) =>
    `/admin/quotes?page=${p}&pageSize=${ps}`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-sm text-gray-500">
            Showing newest first • Total: {total}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Page size</div>
          <div className="flex items-center gap-1">
            {[10, 20, 50].map((ps) => (
              <Link
                key={ps}
                href={mkUrl(1, ps)}
                className={
                  "px-2 py-1 rounded border text-sm " +
                  (ps === currentPageSize
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 hover:bg-gray-50")
                }
              >
                {ps}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Quote #</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q: any) => {
              const vehicle =
                q.vehicle_text ||
                [q.vehicle_make, q.vehicle_model, q.vehicle_year]
                  .filter(Boolean)
                  .join(" ");
              const customer = q.customer_name || q.customer_email || "—";
              const created = q.created_at
                ? new Date(q.created_at).toLocaleString()
                : "—";
              return (
                <tr key={q.quote_id} className="border-t">
                  <td className="p-3 font-medium">
                    {q.quote_number || q.quote_no || "(draft)"}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{customer}</div>
                    <div className="text-xs text-gray-500">
                      {q.customer_phone || ""}
                    </div>
                  </td>
                  <td className="p-3">{vehicle || "—"}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border">
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3">{created}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/quotes/${q.quote_id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}

            {quotes.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={6}>
                  No quotes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={mkUrl(1)}
            className={
              "px-3 py-1.5 rounded border text-sm " +
              (!hasPrev
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-50")
            }
          >
            First
          </Link>
          <Link
            href={mkUrl(currentPage - 1)}
            className={
              "px-3 py-1.5 rounded border text-sm " +
              (!hasPrev
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-50")
            }
          >
            Prev
          </Link>
          <Link
            href={mkUrl(currentPage + 1)}
            className={
              "px-3 py-1.5 rounded border text-sm " +
              (!hasNext
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-50")
            }
          >
            Next
          </Link>
          <Link
            href={mkUrl(totalPages)}
            className={
              "px-3 py-1.5 rounded border text-sm " +
              (!hasNext
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-50")
            }
          >
            Last
          </Link>
        </div>
      </div>
    </div>
  );
}
