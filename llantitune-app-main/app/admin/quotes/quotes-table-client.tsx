"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

type QuoteRow = {
  quote_id: string;
  quote_number: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  min_stock: number | null;
  created_at: string | null;
};

export default function QuotesTableClient(props: {
  quotes: QuoteRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const { quotes, page, pageSize, total, totalPages } = props;

  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  const baseQuery = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("pageSize", String(pageSize));
    return qp;
  }, [pageSize]);

  const prevHref = useMemo(() => {
    const qp = new URLSearchParams(baseQuery);
    qp.set("page", String(Math.max(1, page - 1)));
    return `/admin/quotes?${qp.toString()}`;
  }, [baseQuery, page]);

  const nextHref = useMemo(() => {
    const qp = new URLSearchParams(baseQuery);
    qp.set("page", String(Math.min(totalPages, page + 1)));
    return `/admin/quotes?${qp.toString()}`;
  }, [baseQuery, page, totalPages]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className={`px-3 py-1 rounded border text-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={prevHref}
          >
            Prev
          </Link>
          <span className="text-sm">
            Page {page} / {totalPages}
          </span>
          <Link
            className={`px-3 py-1 rounded border text-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            href={nextHref}
          >
            Next
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2">Quote #</th>
              <th className="text-left px-3 py-2">Customer</th>
              <th className="text-left px-3 py-2">Vehicle</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>
                  No quotes found.
                </td>
              </tr>
            ) : (
              quotes.map((q) => {
                const vehicle = [q.vehicle_make, q.vehicle_model, q.vehicle_year]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={q.quote_id} className="border-t">
                    <td className="px-3 py-2 font-mono">{q.quote_number ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{q.customer_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{q.customer_email ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">{vehicle || "—"}</td>
                    <td className="px-3 py-2">{q.status ?? "—"}</td>
                    <td className="px-3 py-2">
                      {q.created_at ? new Date(q.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="px-3 py-1 rounded border"
                        onClick={() => setManageQuoteId(q.quote_id)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {manageQuoteId && (
        <QuoteManagePanel
          quoteId={manageQuoteId}
          open={true}
          onClose={() => setManageQuoteId(null)}
          onDone={() => setManageQuoteId(null)}
        />
      )}
    </div>
  );
}
