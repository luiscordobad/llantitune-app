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
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) as
    | string
    | undefined;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) as string | undefined;

  const { rows: quotes, total, page: currentPage, pageSize: currentPageSize } =
    await getQuotesPaged({ page, pageSize, status, q });

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const mkUrl = (p: number, ps = currentPageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("pageSize", String(ps));
    if (status && status !== "ALL") params.set("status", status);
    if (q && q.trim()) params.set("q", q.trim());
    return `/admin/quotes?${params.toString()}`;
  };

  const visiblePages = (() => {
    // Keep pager compact: show up to 7 buttons around current page.
    const pages: (number | "…")[] = [];
    const max = totalPages;
    const cur = currentPage;
    const push = (x: number | "…") => {
      if (pages[pages.length - 1] !== x) pages.push(x);
    };
    const range = (a: number, b: number) => {
      for (let i = a; i <= b; i++) push(i);
    };
    if (max <= 9) {
      range(1, max);
      return pages;
    }
    push(1);
    if (cur > 4) push("…");
    range(Math.max(2, cur - 2), Math.min(max - 1, cur + 2));
    if (cur < max - 3) push("…");
    push(max);
    return pages;
  })();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-sm text-gray-500">
            Showing newest first • Total: {total}
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-2" method="get">
          <input type="hidden" name="page" value="1" />

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Search</label>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Quote #, customer, email, vehicle"
              className="px-3 py-2 border rounded-lg text-sm w-64"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Status</label>
            <select
              name="status"
              defaultValue={status ?? "ALL"}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {[
                "ALL",
                "DRAFT",
                "SENT",
                "APPROVED",
                "REJECTED",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Page size</label>
            <select
              name="pageSize"
              defaultValue={String(currentPageSize)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {[10, 20, 50, 100].map((ps) => (
                <option key={ps} value={ps}>
                  {ps}
                </option>
              ))}
            </select>
          </div>

          <button className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:opacity-90">
            Apply
          </button>

          {(status && status !== "ALL") || (q && q.trim()) ? (
            <Link
              href={mkUrl(1, currentPageSize)}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Clear
            </Link>
          ) : null}
        </form>
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

        <div className="flex items-center gap-2 flex-wrap justify-end">
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

          <div className="hidden sm:flex items-center gap-1">
            {visiblePages.map((p, idx) =>
              p === "…" ? (
                <span key={`e${idx}`} className="px-2 text-gray-500">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={mkUrl(p)}
                  className={
                    "px-3 py-1.5 rounded border text-sm " +
                    (p === currentPage
                      ? "bg-black text-white border-black"
                      : "hover:bg-gray-50")
                  }
                >
                  {p}
                </Link>
              )
            )}
          </div>
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
