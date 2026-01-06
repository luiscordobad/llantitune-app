"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Cargando...");
  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch("/api/admin/customer?id=" + encodeURIComponent(id));
      const d = await res.json();
      if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
      setData(d);
      setStatus("OK ✅");
    })();
  }, [id]);

  if (!data) return <div>{status}</div>;

  const c = data.customer;

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Historial</h2>
      <div style={{ color: "#666", marginBottom: 14 }}>
        <b>{c.name ?? "(sin nombre)"}</b> — Tel: {c.phone ?? "-"} | Email: {c.email ?? "-"}
      </div>

      {data.quotes?.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Fecha</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>No.</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Vehículo</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Medidas</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.quotes.map((q: any) => (
              <tr key={q.quote_id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{new Date(q.created_at).toLocaleString()}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.quote_number}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.vehicle_text ?? "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.sizes ?? "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  <a href={`/quote?requote=${q.quote_id}`}>Re-cotizar →</a>
                  {"  "}
                  <button
                    className="btn btnSmall"
                    type="button"
                    onClick={() => setManageQuoteId(String(q.quote_id))}
                    style={{ marginLeft: 8 }}
                  >
                    Gestionar →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ color: "#666" }}>Sin cotizaciones todavía.</div>
      )}

      <QuoteManagePanel
        open={!!manageQuoteId}
        quoteId={manageQuoteId}
        onClose={() => setManageQuoteId(null)}
      />
    </div>
  );
}
