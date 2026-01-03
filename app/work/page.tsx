"use client";

import { useEffect, useState } from "react";

export default function WorkPage() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/work/orders");
      const d = await res.json();
      if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
      setData(d);
      setStatus("OK ✅");
    })();
  }, []);

  if (!data) return <div>{status}</div>;

  return (
    <div>
      <h2>Órdenes de trabajo</h2>
      <p style={{ color: "#666" }}>Vista para mecánicos (sin costos / proveedor / SKU).</p>

      {data.orders?.length ? (
        <div style={{ marginTop: 12 }}>
          {data.orders.map((o: any) => (
            <div key={o.order_id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{o.quote_number}</b> — <span style={{ color: "#666" }}>{o.status}</span>
                  <div style={{ color: "#666" }}>Cliente: {o.customer_name ?? "-"} {o.vehicle_text ? `| Vehículo: ${o.vehicle_text}` : ""} {o.promised_at ? `| Promesa: ${o.promised_at}` : ""}</div>
                </div>
                <a href={`/work/${o.order_id}`}>Ver →</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#666" }}>No hay órdenes todavía.</div>
      )}
    </div>
  );
}
