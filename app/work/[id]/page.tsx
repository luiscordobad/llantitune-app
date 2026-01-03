"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function WorkOrderDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch("/api/work/order?id=" + encodeURIComponent(id));
      const d = await res.json();
      if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
      setData(d);
      setStatus("OK ✅");
    })();
  }, [id]);

  if (!data) return <div>{status}</div>;

  return (
    <div>
      <h2>Orden</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        <b>{data.quote_number}</b> — {data.status}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        {data.items?.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Medida</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Marca</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Load</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it: any) => (
                <tr key={it.order_item_id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.size}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.brand}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.load_speed ?? ""}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>{it.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: "#666" }}>Sin ítems.</div>
        )}
      </div>
    </div>
  );
}
