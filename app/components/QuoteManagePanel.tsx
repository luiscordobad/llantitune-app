"use client";

import { useEffect, useMemo, useState } from "react";

type QuotePayload = {
  quote: any;
  lines: any[];
  items: any[];
};

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  try {
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  } catch {
    return String(v);
  }
}

export default function QuoteManagePanel({
  open,
  quoteId,
  onClose,
}: {
  open: boolean;
  quoteId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<QuotePayload | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !quoteId) return;

    let cancelled = false;
    (async () => {
      setStatus("Cargando cotización...");
      setData(null);

      try {
        const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, { cache: "no-store" });
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("Error: " + (d.error ?? "unknown"));
          return;
        }
        setData(d);
        setStatus("OK ✅");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("Error: " + (e?.message ?? String(e)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, quoteId]);

  const byLine = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of data?.items ?? []) {
      const lid = String(it.line_id);
      if (!map.has(lid)) map.set(lid, []);
      map.get(lid)!.push(it);
    }
    return map;
  }, [data]);

  const quote = data?.quote;
  const folio = quote?.quote_number || quote?.quote_no || quoteId || "-";
  const canApprove = quote?.status === "SENT";
  const isDraft = quote?.status === "DRAFT";
  const isApproved = quote?.status === "APPROVED";

  async function reload() {
    if (!quoteId) return;
    setStatus("Actualizando...");
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        setStatus("Error: " + (d.error ?? "unknown"));
        return;
      }
      setData(d);
      setStatus("OK ✅");
    } catch (e: any) {
      setStatus("Error: " + (e?.message ?? String(e)));
    }
  }

  async function selectOption(lineId: string, quoteItemId: string) {
    if (!quoteId) return;
    setBusy(true);
    setStatus("Guardando selección...");
    try {
      const res = await fetch("/api/quote/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, lineId, quoteItemId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus("Error: " + (d.error ?? "unknown"));
        return;
      }
      await reload();
      setStatus("OK ✅ Selección guardada");
    } finally {
      setBusy(false);
    }
  }

  async function markAsSent() {
    if (!quoteId) return;
    setBusy(true);
    setStatus("Marcando como enviada...");
    try {
      const res = await fetch("/api/quotes/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus("Error: " + (d.error ?? "unknown"));
        return;
      }
      await reload();
      setStatus("OK ✅ Marcada como SENT");
    } finally {
      setBusy(false);
    }
  }

  async function approveAndSendToWorkshop() {
    if (!quoteId) return;
    setBusy(true);
    setStatus("Aprobando y creando OT...");
    try {
      const res = await fetch("/api/quotes/approve-and-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus("Error: " + (d.error ?? "unknown"));
        return;
      }
      setStatus("OK ✅ OT creada");
      window.location.href = `/admin/orders?open=${encodeURIComponent(d.order_id)}`;
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Gestionar cotización">
      <div className="drawerPanel">
        <div className="drawerHeader">
          <div>
            <div className="drawerTitle">Gestionar cotización</div>
            <div className="drawerSub">
              <b>{folio}</b> · <span className="pill">{quote?.status ?? "..."}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" type="button" onClick={reload} disabled={busy}>
              Refrescar
            </button>
            <button className="btn" type="button" onClick={onClose} disabled={busy}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="drawerBody">
          {!data ? (
            <div className="card cardPadLg">
              <div className="muted">{status || "Cargando..."}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {/* Status / guidance */}
              {!canApprove && !isApproved && (
                <div className="card cardPad" style={{ borderColor: "var(--warn-200)", background: "var(--warn-50)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>Acción requerida</div>
                      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        Para aprobar, la cotización debe estar en <b>SENT</b>.
                        {isDraft ? " Esta está en DRAFT." : ""}
                      </div>
                    </div>
                    {isDraft && (
                      <button className="btn btnPrimary" type="button" onClick={markAsSent} disabled={busy}>
                        Marcar como enviada (SENT)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isApproved && (
                <div className="card cardPad" style={{ borderColor: "var(--ok-200)", background: "var(--ok-50)" }}>
                  <div style={{ fontWeight: 800 }}>Cotización aprobada</div>
                  <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                    Ya fue aprobada. Si necesitas verla en taller, búscala en Órdenes por el mismo folio.
                  </div>
                </div>
              )}

              {/* Lines */}
              <div className="card cardPadLg">
                <div className="space">
                  <div style={{ fontWeight: 900 }}>Selecciona la opción ganadora</div>
                  <div className="muted" style={{ fontSize: 12 }}>{status}</div>
                </div>

                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {(data.lines ?? []).map((ln: any) => {
                    const lid = String(ln.line_id);
                    const options = byLine.get(lid) ?? [];
                    const selected = ln.selected_quote_item_id ? String(ln.selected_quote_item_id) : null;

                    return (
                      <div className="card cardPad" key={lid}>
                        <div className="space">
                          <div>
                            <div style={{ fontWeight: 900 }}>
                              {ln.size ?? "-"} <span style={{ opacity: 0.6 }}>×</span> {ln.quantity ?? 1}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {ln.vehicle_make || ln.vehicle_model || ln.vehicle_year
                                ? `${ln.vehicle_make ?? ""} ${ln.vehicle_model ?? ""} ${ln.vehicle_year ?? ""}`.trim()
                                : "—"}
                            </div>
                          </div>
                          <span className={selected ? "pill pillOk" : "pill"}>
                            {selected ? "Seleccionada" : "Sin selección"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {options.length === 0 ? (
                            <div className="muted" style={{ fontSize: 12 }}>
                              No hay opciones para esta línea.
                            </div>
                          ) : (
                            options.map((it: any) => {
                              const id = String(it.quote_item_id);
                              const isSel = selected === id;

                              return (
                                <button
                                  key={id}
                                  className="optRow"
                                  type="button"
                                  onClick={() => selectOption(lid, id)}
                                  disabled={busy}
                                  style={{
                                    border: isSel ? "1px solid var(--primary-300)" : "1px solid var(--border)",
                                    background: isSel ? "var(--primary-50)" : "white",
                                    textAlign: "left",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {(it.brand ?? "-") + " " + (it.model ?? "")}
                                      </div>
                                      <div className="muted" style={{ fontSize: 12 }}>
                                        {it.load_speed ? `${it.load_speed} · ` : ""}
                                        {it.provider ? `${it.provider}` : "Proveedor -"}
                                        {it.sku ? ` · SKU ${it.sku}` : ""}
                                        {it.stock != null ? ` · Stock ${it.stock}` : ""}
                                      </div>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontWeight: 900 }}>{money(it.price_each)}</div>
                                      <div className="muted" style={{ fontSize: 12 }}>
                                        Total {money(it.total_with_services ?? it.total_tires ?? it.total)}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                                    <span className={isSel ? "pill pillOk" : "pill"}>
                                      {isSel ? "Elegida" : "Elegir"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="drawerFooter">
                <button className="btn" type="button" onClick={onClose} disabled={busy}>
                  Cerrar
                </button>
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={approveAndSendToWorkshop}
                  disabled={busy || !canApprove}
                  title={!canApprove ? "Solo se puede aprobar una cotización enviada (SENT)." : ""}
                >
                  Aprobar → Enviar a taller
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
