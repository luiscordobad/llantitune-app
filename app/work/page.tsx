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
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card cardPadLg">
        <div className="space">
          <div>
            <h1 className="h1">Órdenes</h1>
            <p className="p">Vista para mecánicos: seguimiento de avance (sin costos / proveedor / SKU).</p>
          </div>
          <span className="badge"><span className="badgeDot" />Taller</span>
        </div>
      </div>

      <div>
      

      {data.orders?.length ? (
        <div style={{ marginTop: 12 }}>
          {data.orders.map((o: any) => (
            <div key={o.order_id} className="card cardPad" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{o.quote_number}</b> — <span className="small">{o.status}</span>
                  <div className="small">Cliente: {o.customer_name ?? "-"} {o.vehicle_text ? `| Vehículo: ${o.vehicle_text}` : ""} {o.promised_at ? `| Promesa: ${o.promised_at}` : ""}</div>
                </div>
                <a className="btn btnSmall" href={`/work/${o.order_id}`}>Ver →</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="small">No hay órdenes todavía.</div>
      )}
    </div>
  );
}
