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
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("Escribe teléfono, folio, nombre o email.");
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const hasQuery = useMemo(() => (q || "").trim().length > 0, [q]);

  async function runSearch(term: string) {
    const t = (term || "").trim();
    if (!t) {
      setRows([]);
      setStatus("Escribe teléfono, folio, nombre o email.");
      return;
    }
    setStatus("Buscando...");
    const res = await fetch(
      `/api/admin/quotes/search?q=${encodeURIComponent(t)}`,
      { cache: "no-store" }
    );
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("Error: " + (d.error ?? "unknown"));
      return;
    }
    setRows(d.rows ?? []);
    setStatus(`Resultados: ${(d.rows ?? []).length}`);
  }

  function handleManage(e: any, id: string) {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch {}
    setQuoteId(String(id));
    setOpen(true);
  }

  useEffect(() => {
    setStatus("Escribe teléfono, folio, nombre o email.");
  }, []);

  return (
    <div style={{ maxWidth: 1150 }}>
      <div className="card cardPadLg">
        <h2 style={{ margin: 0 }}>Cotizaciones</h2>
        <div style={{ opacity: 0.75, marginTop: 4 }}>
          Buscar y gestionar cotizaciones (selección + aprobar → OT).
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Teléfono, folio (LT-...), nombre, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(q);
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => runSearch(q)}
          >
            Buscar
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setQ("");
              setRows([]);
              setStatus("Escribe teléfono, folio, nombre o email.");
            }}
          >
            Limpiar
          </button>
          <span className="pill" style={{ marginLeft: "auto" }}>
            {status}
          </span>
        </div>
      </div>

      <div className="card cardPadLg" style={{ marginTop: 14 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.75 }}>
            {hasQuery ? "Sin resultados." : "Haz una búsqueda para ver cotizaciones."}
          </div>
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
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.quote_id}>
                  <td>{fmtDate(r.created_at)}</td>
                  <td style={{ fontWeight: 800 }}>{r.quote_number ?? r.quote_no ?? "-"}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.customer_name ?? "-"}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{r.customer_phone ?? r.customer_email ?? ""}</div>
                  </td>
                  <td>{r.vehicle_text ?? "-"}</td>
                  <td>{r.sizes ?? "-"}</td>
                  <td>
                    <span className={"pill " + (r.status === "SENT" ? "pillOk" : "")}>
                      {r.status ?? "-"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btnPrimary"
                      type="button"
                      onClick={(e) => handleManage(e, r.quote_id)}
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
