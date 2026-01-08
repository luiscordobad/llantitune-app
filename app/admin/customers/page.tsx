"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";

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
    <div>
      <PageHeader
        title="Clientes"
        description="Busca por nombre, teléfono o email y consulta el historial."
        right={<span className="badge">{status || " "}</span>}
      />

      <div className="card cardPadLg" style={{ maxWidth: 980 }}>
        <div className="row" style={{ gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 320, flex: 1 }}>
            <div className="label">Búsqueda</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre / Tel / Email"
            />
          </div>
          <button className="btn btnPrimary" onClick={search}>Buscar</button>
        </div>
      </div>

      {data?.customers?.length ? (
        <div style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 980 }}>
          {data.customers.map((c: any) => (
            <div key={c.customer_id} className="card cardPadLg">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{c.name ?? "(sin nombre)"}</div>
                  <p className="p">Tel: {c.phone ?? "-"} · Email: {c.email ?? "-"}</p>
                </div>
                <a className="btn" href={`/admin/customers/${c.customer_id}`}>Ver historial</a>
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="card cardPadLg" style={{ marginTop: 16, maxWidth: 980 }}>
          <p className="p" style={{ margin: 0 }}>Sin resultados.</p>
        </div>
      ) : null}
    </div>
  );
}
