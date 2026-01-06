"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/components/PageHeader";

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

  if (!data) return <div className="card cardPadLg"><span className="badge">{status}</span></div>;

  return (
    <div>
      <PageHeader
        title="Órdenes"
        description="Admin: gestiona estatus, promesa, anticipo, notas y asignación."
        right={<span className="badge">{status}</span>}
      />

      <div className="card cardPadLg" style={{ maxWidth: 1200 }}>
        <div className="field">
          <div className="label">Nota rápida</div>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Se guarda en timeline cuando cambias status / guardas"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 14, marginTop: 14, maxWidth: 1200 }}>
        <div>
          {(data.orders ?? []).length ? (
            <div className="card cardPadLg">
              <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>No.</th>
                  <th style={{ textAlign: "left" }}>Cliente</th>
                  <th style={{ textAlign: "left" }}>Estatus</th>
                  <th style={{ textAlign: "left" }}>Promesa</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {(data.orders ?? []).map((o: any) => (
                  <tr key={o.order_id} style={{ background: selectedOrderId === o.order_id ? "rgba(31,95,191,0.06)" : "transparent" }}>
                    <td><b>{o.quote_number}</b></td>
                    <td>
                      {o.customer_name ?? "-"}
                      {o.vehicle_text ? <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{o.vehicle_text}</div> : null}
                    </td>
                    <td><span className="badge">{o.status}</span></td>
                    <td>{o.promised_at ?? "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn" onClick={() => { setSelectedOrderId(o.order_id); setSelectedQuoteId(o.quote_id); }}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          ) : (
            <div className="card cardPadLg"><p className="p" style={{ margin: 0 }}>Sin pedidos todavía.</p></div>
          )}
        </div>

        <div className="card cardPadLg">
          {!selectedOrderId ? (
            <p className="p" style={{ margin: 0 }}>Selecciona un pedido.</p>
          ) : (
            <>
              <div className="cardTitle" style={{ marginBottom: 10 }}>Editar pedido</div>
              {(() => {
                const o = (data.orders ?? []).find((x: any) => x.order_id === selectedOrderId);
                if (!o) return null;

                return (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div><b>{o.quote_number}</b></div>

                    <div className="field">
                      <div className="label">Estatus</div>
                      <select className="select" value={o.status} onChange={e => patchOrder(o.order_id, { status: e.target.value })}>
                        {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="field">
                      <div className="label">Promesa (fecha)</div>
                      <input className="input" type="date" value={o.promised_at ?? ""} onChange={e => patchOrder(o.order_id, { promised_at: e.target.value || null })} />
                    </div>

                    <div className="field">
                      <div className="label">Anticipo (MXN)</div>
                      <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={o.deposit_amount ?? ""} onChange={e => patchOrder(o.order_id, { deposit_amount: e.target.value ? Number(e.target.value) : null })} />
                    </div>

                    <div className="field">
                      <div className="label">Asignado a (mecánico)</div>
                      <select className="select" value={o.assigned_to ?? ""} onChange={e => patchOrder(o.order_id, { assigned_to: e.target.value || null })}>
                        <option value="">(sin asignar)</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                      </select>
                    </div>

                    <div className="field">
                      <div className="label">Atendido por (quien instaló)</div>
                      <select className="select" value={o.attended_by ?? ""} onChange={e => patchOrder(o.order_id, { attended_by: e.target.value || null })}>
                        <option value="">(sin definir)</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>)}
                      </select>
                    </div>

                    <div className="field">
                      <div className="label">Notas internas</div>
                      <textarea className="textarea" value={o.internal_notes ?? ""} onChange={e => patchOrder(o.order_id, { internal_notes: e.target.value })} />
                    </div>

                    <a href={`/admin/orders?quoteId=${o.quote_id}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Refrescar vista</a>

                    <div className="hr" />

                    <div className="cardTitle" style={{ fontSize: 14 }}>Timeline</div>
                    {timeline.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {timeline.map((ev: any) => (
                          <div key={ev.event_id} className="card cardPad">
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(ev.created_at).toLocaleString()}</div>
                            <div><b>{ev.event_type}</b> {ev.to_status ? `→ ${ev.to_status}` : ""}</div>
                            {ev.note ? <div style={{ whiteSpace: "pre-wrap", color: "#444" }}>{ev.note}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p" style={{ margin: 0 }}>Sin eventos.</p>
                    )}

                    <div className="hr" />

                    <a className="btn" href={`/work/${o.order_id}`} target="_blank" rel="noreferrer">Abrir vista mecánico →</a>
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
