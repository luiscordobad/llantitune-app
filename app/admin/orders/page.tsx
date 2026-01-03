"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quoteId");
    if (!quoteId) return setStatus("Falta quoteId en URL.");
    (async () => {
      const res = await fetch("/api/admin/order?quoteId=" + encodeURIComponent(quoteId));
      const d = await res.json();
      if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
      setData(d);
      setStatus("OK ✅");
    })();
  }, []);

  if (!data) return <div>{status}</div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Pedido interno</h2>
      <div style={{ color: "#666", marginBottom: 12 }}>
        Cotización: <b>{data.quoteNumber}</b>
      </div>

      {!data.items?.length ? (
        <div style={{ color: "#a00" }}>
          Aún no hay selección final. Entra a la cotización y elige una opción por medida.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Medida</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Marca</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Load</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Proveedor</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>SKU</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Qty</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Costo</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Venta</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it: any) => (
              <tr key={it.order_item_id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.size}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.brand}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.load_speed ?? ""}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.provider}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.sku}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>{it.qty}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>${it.cost_each}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>${it.price_each}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>${it.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
