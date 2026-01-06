
"use client";

import { useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function QuotesPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(
      `/api/admin/quotes/search?q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2>Cotizaciones</h2>
      <p style={{ opacity: 0.7 }}>
        Busca por teléfono, folio, nombre o email
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cotización…"
          onKeyDown={(e) => e.key === "Enter" && search()}
          style={{ flex: 1 }}
        />
        <button className="btn btnPrimary" onClick={search}>
          Buscar
        </button>
      </div>

      {loading && <div>Cargando…</div>}

      {!loading && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Estatus</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.quote_id}>
                <td>{new Date(q.created_at).toLocaleDateString()}</td>
                <td>{q.quote_number ?? q.quote_no}</td>
                <td>{q.customer_name}</td>
                <td>{q.customer_phone ?? q.customer_email}</td>
                <td>{q.status}</td>
                <td>
                  <button
                    className="btn btnPrimary"
                    onClick={() => setManageQuoteId(q.quote_id)}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <QuoteManagePanel
        open={Boolean(manageQuoteId)}
        quoteId={manageQuoteId}
        onClose={() => setManageQuoteId(null)}
      />
    </div>
  );
}
