"use client";

import { useEffect, useMemo, useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

function fmtDate(s: any) {
  try {
    const d = new Date(String(s));
    return d.toLocaleString("es-MX");
  } catch {
    return String(s ?? "-");
  }
}

export default function QuotesSearchPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  async function runSearch(nextQ?: string) {
    const term = (nextQ ?? q).trim();
    if (!term) {
      setRows([]);
      setStatus("Escribe teléfono, folio, nombre o email.");
      return;
    }
    setStatus("Buscando...");
    const res = await fetch(`/api/admin/quotes/search?q=${encodeURIComponent(term)}`, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) {
      setStatus("Error: " + (d.error ?? "unknown"));
      return;
    }
    setRows(d.rows ?? []);
    setStatus(`Resultados: ${(d.rows ?? []).length}`);
  }

  useEffect(() => {
    setStatus("Escribe teléfono, folio, nombre o email.");
  }, []);

  const hasRows = rows.length > 0;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card cardPadLg">
        <div className="space">
          <div>
            <div className="h1">Cotizaciones</div>
            <div className="sub">Buscar y gestionar cotizaciones (selección + aprobar → OT).</div>
          </div>
          <div className="pill">{status || ""}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <input
            className="input"
            value={q}
            placeholder="Teléfono, folio (LT-...), nombre, email o vehículo"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            style={{ flex: 1 }}
          />
          <button className="btn btnPrimary" onClick={() => runSearch()}>
            Buscar
          </button>
          <button className="btn" onClick={() => { setQ(""); setRows([]); setStatus("Escribe teléfono, folio, nombre o email."); }}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="card cardPadLg">
        {!hasRows ? (
          <div style={{ opacity: 0.75 }}>Sin resultados.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>No.</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Medidas</th>
                <th>Estatus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.quote_id}>
                  <td>{fmtDate(r.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{r.quote_number ?? r.quote_no ?? "-"}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.customer_name ?? "-"}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{r.customer_phone ?? ""}{r.customer_email ? ` · ${r.customer_email}` : ""}</div>
                  </td>
                  <td>{r.vehicle_text ?? "-"}</td>
                  <td>{r.size ?? "-"}{r.quantity ? ` x${r.quantity}` : ""}</td>
                  <td><span className="pill">{r.status}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btnPrimary"
                      onClick={() => { setQuoteId(r.quote_id); setOpen(true); }}
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <QuoteManagePanel
        open={open}
        quoteId={quoteId}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
