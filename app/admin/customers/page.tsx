"use client";

import { useMemo, useState } from "react";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("");

  async function search() {
    setStatus("Buscando...");
    const res = await fetch("/api/admin/customers?query=" + encodeURIComponent(q));
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    setData(d);
    setStatus(`OK ✅ ${d.customers?.length ?? 0} resultados`);
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Clientes + historial</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre / Tel / Email" style={{ width: 360 }} />
        <button onClick={search}>Buscar</button>
        <span style={{ color: "#555" }}>{status}</span>
      </div>

      {data?.customers?.length ? (
        <div style={{ marginTop: 16 }}>
          {data.customers.map((c: any) => (
            <div key={c.customer_id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{c.name ?? "(sin nombre)"}</b>
                  <div style={{ color: "#666" }}>Tel: {c.phone ?? "-"} | Email: {c.email ?? "-"}</div>
                </div>
                <a href={`/admin/customers/${c.customer_id}`}>Ver historial →</a>
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <div style={{ marginTop: 16, color: "#666" }}>Sin resultados.</div>
      ) : null}
    </div>
  );
}
