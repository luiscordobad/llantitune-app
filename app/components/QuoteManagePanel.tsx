"use client";

import { useEffect, useMemo, useState } from "react";

type QuotePayload = {
  quote: any;
  lines: any[];
  items: any[];
};

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
  const [selectedByLine, setSelectedByLine] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !quoteId) return;

    let cancelled = false;
    (async () => {
      setStatus("Cargando cotización...");
      setData(null);
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
      const d = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setStatus("Error: " + (d.error ?? "unknown"));
        return;
      }
      setData(d);
      const initial: Record<string, string> = {};
      for (const ln of d.lines ?? []) {
        if (ln.selected_quote_item_id) initial[String(ln.line_id)] = String(ln.selected_quote_item_id);
      }
      setSelectedByLine(initial);
      setStatus("OK ✅");
    })();

    return () => {
      cancelled = true;
    };
  }, [open, quoteId]);

  const itemsByLine = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of data?.items ?? []) {
      const lid = String(it.line_id);
      if (!map.has(lid)) map.set(lid, []);
      map.get(lid)!.push(it);
    }
    return map;
  }, [data]);

  function money(n: any) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "-";
    try {
      return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    } catch {
      return String(v);
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
      setSelectedByLine((p) => ({ ...p, [lineId]: quoteItemId }));
      setStatus("OK ✅ Selección guardada");
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
      // Open Admin Orders with the newly created order selected
      window.location.href = `/admin/orders?open=${encodeURIComponent(d.order_id)}`;
    } finally {
      setBusy(false);
    }
  }

  const quote = data?.quote;
  const canApprove = quote?.status === "SENT";

  if (!open) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Gestionar cotización">
      <div className="drawerBackdrop" onClick={onClose} aria-hidden />
      <div className="drawerPanel">
        <div className="drawerHeader">
          <div>
            <div className="drawerTitle">Gestionar cotización</div>
            <div className="drawerSub">Selecciona la opción elegida y aprueba para enviar a taller.</div>
          </div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="drawerBody">
          {!data ? (
            <div className="card cardPadLg">
              <span className="badge">{status || "Cargando..."}</span>
            </div>
          ) : (
            <>
              <div className="card cardPadLg">
                <div className="space" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="cardTitle" style={{ marginBottom: 6 }}>
                      {quote?.quote_number ?? "Cotización"}
                    </div>
                    <div className="small" style={{ lineHeight: 1.45 }}>
                      <div>
                        <b>Cliente:</b> {quote?.customer_name ?? "-"} {quote?.customer_phone ? `· ${quote.customer_phone}` : ""}
                        {quote?.customer_email ? ` · ${quote.customer_email}` : ""}
                      </div>
                      <div>
                        <b>Vehículo:</b> {quote?.vehicle_text ?? "-"}
                      </div>
                      <div>
                        <b>Estatus:</b> <span className="badge">{quote?.status}</span>
                      </div>
                    </div>
                  </div>
                  <span className="badge" title="Estado del panel">{status || " "}</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {(data.lines ?? []).map((ln: any) => {
                  const lid = String(ln.line_id);
                  const options = itemsByLine.get(lid) ?? [];
                  const selectedId = selectedByLine[lid] ?? "";

                  return (
                    <div key={lid} className="card cardPadLg">
                      <div className="space" style={{ alignItems: "flex-start" }}>
                        <div>
                          <div className="cardTitle" style={{ fontSize: 16 }}>
                            Línea {ln.line_no ?? ""} · {ln.size} × {ln.quantity}
                          </div>
                          <p className="p" style={{ marginTop: 6 }}>
                            Selecciona la opción elegida por el cliente.
                          </p>
                        </div>
                        {selectedId ? <span className="badge">Seleccionada</span> : <span className="badge">Sin elegir</span>}
                      </div>

                      {options.length ? (
                        <div className="optionGrid" style={{ marginTop: 12 }}>
                          {options.slice(0, 8).map((it: any) => {
                            const id = String(it.quote_item_id);
                            const active = id === selectedId;
                            return (
                              <button
                                key={id}
                                type="button"
                                className={`optionCard ${active ? "optionCardActive" : ""}`}
                                onClick={() => selectOption(lid, id)}
                                disabled={busy}
                              >
                                <div className="optionTop">
                                  <div className="optionBrand">{it.brand ?? "-"}</div>
                                  <div className="optionPrice">{money(it.total_with_services ?? it.total_tires ?? it.price_each)}</div>
                                </div>
                                <div className="small" style={{ marginTop: 4 }}>
                                  {it.model ?? ""} {it.load_speed ? `· ${it.load_speed}` : ""}
                                </div>
                                <div className="optionMeta">
                                  <span className={`pill ${Number(it.stock) >= Number(ln.quantity) ? "pillOk" : ""}`}>
                                    Stock: {it.stock ?? "-"}
                                  </span>
                                  {it.provider ? <span className="pill">{it.provider}</span> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="small" style={{ marginTop: 10, color: "var(--muted)" }}>
                          Sin opciones registradas para esta línea.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="drawerFooter">
          <div className="row" style={{ gap: 10, justifyContent: "space-between", width: "100%" }}>
            <div className="small" style={{ color: "var(--muted)" }}>
              {canApprove ? "Al aprobar se crea OT automáticamente (sin asignar)." : "La cotización debe estar en SENT para aprobar."}
            </div>
            <div className="row" style={{ gap: 10 }}>
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
        </div>
      </div>
    </div>
  );
}
