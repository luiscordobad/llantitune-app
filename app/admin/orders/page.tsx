"use client";

import { useEffect, useMemo, useState } from "react";

const ORDER_STATUSES = ["DRAFT","ORDERED","RECEIVED","INSTALLED","CLOSED"];

export default function AdminOrders() {
  const [data, setData] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [status, setStatus] = useState("Cargando...");

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [note, setNote] = useState("");

  async function load() {
    setStatus("Cargando...");
    const res = await fetch("/api/admin/orders");
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    setData(d);
    setStatus("OK ✅");
  }

  async function loadProfiles() {
    const res = await fetch("/api/admin/profiles");
    const d = await res.json();
    if (res.ok) setProfiles(d.profiles ?? []);
  }

  async function loadTimeline(entityType: string, entityId: string) {
    const res = await fetch(`/api/admin/timeline?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
    const d = await res.json();
    if (res.ok) setTimeline(d.events ?? []);
  }

  useEffect(() => {
    load();
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedOrderId) loadTimeline("ORDER", selectedOrderId);
  }, [selectedOrderId]);

  async function patchOrder(orderId: string, patch: any) {
    setStatus("Guardando...");
    const res = await fetch("/api/admin/order/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, patch, note: note || null })
    });
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    setNote("");
    await load();
    setStatus("OK ✅");
    if (selectedOrderId === orderId) await loadTimeline("ORDER", orderId);
  }

  const mechanics = useMemo(() => profiles.filter(p => p.role === "mechanic"), [profiles]);

  if (!data) return <div>{status}</div>;

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2>Pedidos internos</h2>
      <p style={{ color: "#666", marginTop: -6 }}>
        Admin: gestiona estatus, promesa, anticipo, notas y asignación.
      </p>

      <div style={{ color: "#555", marginBottom: 10 }}>{status}</div>

      <label>Nota rápida (se guarda en timeline cuando cambias status/guardas)
        <textarea value={note} onChange={e => setNote(e.target.value)} style={{ width: "100%", minHeight: 60 }} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14, marginTop: 12 }}>
        <div>
          {(data.orders ?? []).length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>No.</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cliente</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Estatus</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Promesa</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {(data.orders ?? []).map((o: any) => (
                  <tr key={o.order_id} style={{ background: selectedOrderId === o.order_id ? "#fafafa" : "transparent" }}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}><b>{o.quote_number}</b></td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {o.customer_name ?? "-"}<div style={{ color: "#666", fontSize: 12 }}>{o.vehicle_text ?? ""}</div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{o.status}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{o.promised_at ?? "-"}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <button onClick={() => { setSelectedOrderId(o.order_id); setSelectedQuoteId(o.quote_id); }}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#666" }}>Sin pedidos todavía.</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          {!selectedOrderId ? (
            <div style={{ color: "#666" }}>Selecciona un pedido.</div>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>Editar pedido</h3>
              {(() => {
                const o = (data.orders ?? []).find((x: any) => x.order_id === selectedOrderId);
                if (!o) return null;

                return (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ color: "#444" }}><b>{o.quote_number}</b></div>

                    <label>Estatus
                      <select value={o.status} onChange={e => patchOrder(o.order_id, { status: e.target.value })}>
                        {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>

                    <label>Promesa (fecha)
                      <input type="date" value={o.promised_at ?? ""} onChange={e => patchOrder(o.order_id, { promised_at: e.target.value || null })} />
                    </label>

                    <label>Anticipo (MXN)
                      <input type="number" value={o.deposit_amount ?? ""} onChange={e => patchOrder(o.order_id, { deposit_amount: e.target.value ? Number(e.target.value) : null })} />
                    </label>

                    <label>Asignado a (mecánico)
                      <select value={o.assigned_to ?? ""} onChange={e => patchOrder(o.order_id, { assigned_to: e.target.value || null })}>
                        <option value="">(sin asignar)</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                      </select>
                    </label>

                    <label>Atendido por (quien instaló)
                      <select value={o.attended_by ?? ""} onChange={e => patchOrder(o.order_id, { attended_by: e.target.value || null })}>
                        <option value="">(sin definir)</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                      </select>
                    </label>

                    <label>Notas internas
                      <textarea value={o.internal_notes ?? ""} onChange={e => patchOrder(o.order_id, { internal_notes: e.target.value })} style={{ width: "100%", minHeight: 90 }} />
                    </label>

                    <a href={`/admin/orders?quoteId=${o.quote_id}`}>Refrescar vista</a>

                    <hr />

                    <h4 style={{ margin: 0 }}>Timeline</h4>
                    {timeline.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {timeline.map((ev: any) => (
                          <div key={ev.event_id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                            <div style={{ color: "#666", fontSize: 12 }}>{new Date(ev.created_at).toLocaleString()}</div>
                            <div><b>{ev.event_type}</b> {ev.to_status ? `→ ${ev.to_status}` : ""}</div>
                            {ev.note ? <div style={{ whiteSpace: "pre-wrap", color: "#444" }}>{ev.note}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#666" }}>Sin eventos.</div>
                    )}

                    <hr />

                    <a href={`/work/${o.order_id}`} target="_blank" rel="noreferrer">Abrir vista mecánico →</a>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
