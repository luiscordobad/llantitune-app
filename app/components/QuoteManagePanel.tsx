"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QuoteDetail = {
  quote: any;
  lines: any[];
  items: any[];
};

async function safeJson(res: Response) {
  // Avoid crashing on HTML/redirect error pages.
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      // fall through
    }
  }
  // Try parse anyway; if not, throw friendly error with snippet
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text?.slice(0, 220)?.replace(/\s+/g, " ") || "";
    throw new Error(
      `Server did not return JSON (status ${res.status}). ${snippet}`
    );
  }
}

export function QuoteManagePanel({
  quoteId,
  open,
  onClose
}: {
  quoteId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!quoteId || !open) return;
    setLoading(true);
    setError(null);
    try {
      // Use singular /api/quote/* to align with existing API namespace in the app.
      const res = await fetch(`/api/quote/${quoteId}`, { cache: "no-store" });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error ?? "Failed to load quote");
      setDetail(j);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, open]);

  const itemsByLine = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of detail?.items ?? []) {
      const lid = String(it.line_id ?? "");
      if (!m.has(lid)) m.set(lid, []);
      m.get(lid)!.push(it);
    }
    return m;
  }, [detail]);

  const selectedCount = useMemo(() => {
    return (detail?.lines ?? []).filter((l) => !!l.selected_quote_item_id).length;
  }, [detail]);

  const folioText = useMemo(() => {
    const q = detail?.quote ?? {};
    return q.quote_number || q.quote_no || q.quote_id || quoteId || "-";
  }, [detail, quoteId]);

  async function selectWinner(lineId: string, quoteItemId: string) {
    if (!quoteId) return;
    setSaving(`select:${lineId}:${quoteItemId}`);
    setError(null);
    try {
      const res = await fetch("/api/quote/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          lineId,
          quoteItemId
        })
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error ?? "Failed to select winner");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  async function markSent() {
    if (!quoteId) return;
    setSaving("markSent");
    setError(null);
    try {
      const res = await fetch("/api/quotes/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId })
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error ?? "Failed to mark as SENT");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  async function approveAndConvert() {
    if (!quoteId) return;
    if (!detail) return;

    if (
      !confirm(
        "Esto aprobará la cotización, creará una orden de trabajo y la enviará al taller. ¿Continuar?"
      )
    ) {
      return;
    }

    setSaving("approve");
    setError(null);
    try {
      const res = await fetch("/api/quotes/approve-and-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId })
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error ?? "Failed to approve/convert");

      const orderId = j.order_id as string;
      onClose();
      // Some deployments keep orders in /admin/orders; others in /work. We keep current behavior:
      router.push(`/admin/orders?open=${encodeURIComponent(orderId)}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  if (!open) return null;

  const status = detail?.quote?.status ?? "...";
  const canApprove = status === "SENT";

  return (
    <div className="ltDrawerOverlay" role="dialog" aria-modal="true">
      <div className="ltDrawer">
        <div className="ltDrawerHeader">
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Gestionar cotización</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              {folioText} {" · "}
              <span className={"pill " + (status === "SENT" ? "pillOk" : "")}>
                {status}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={load} type="button">
              Refrescar
            </button>
            <button className="btn" onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </div>

        <div className="ltDrawerBody">
          {loading && <div className="card cardPadLg">Cargando cotización...</div>}

          {error && (
            <div className="card cardPadLg" style={{ borderColor: "var(--danger-200)" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
            </div>
          )}

          {!loading && detail && status === "DRAFT" && (
            <div className="card cardPadLg" style={{ borderColor: "var(--warn-200)" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>
                Esta cotización está en DRAFT
              </div>
              <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 10 }}>
                Para aprobar y enviar a taller, primero márcala como enviada (SENT).
              </div>
              <button
                className="btn btnPrimary"
                type="button"
                disabled={saving === "markSent"}
                onClick={markSent}
              >
                {saving === "markSent" ? "Guardando…" : "Marcar como enviada (SENT)"}
              </button>
            </div>
          )}

          {!loading && detail && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="card cardPadLg">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>Líneas</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    Seleccionadas: <b>{selectedCount}</b> / {(detail.lines ?? []).length}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {(detail.lines ?? []).map((ln: any) => {
                    const lid = String(ln.line_id);
                    const opts = itemsByLine.get(lid) ?? [];
                    const selectedId = ln.selected_quote_item_id ? String(ln.selected_quote_item_id) : null;

                    return (
                      <div key={lid} className="card cardPad">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>
                              {ln.size ?? "-"} <span style={{ opacity: 0.6 }}>×</span> {ln.quantity ?? 1}
                            </div>
                            <div style={{ opacity: 0.75, fontSize: 12 }}>
                              {ln.vehicle_make || ln.vehicle_model || ln.vehicle_year
                                ? `${ln.vehicle_make ?? ""} ${ln.vehicle_model ?? ""} ${ln.vehicle_year ?? ""}`.trim()
                                : "—"}
                            </div>
                          </div>

                          <div>
                            {selectedId ? (
                              <span className="pill pillOk">Seleccionada</span>
                            ) : (
                              <span className="pill">Sin selección</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {opts.length === 0 && (
                            <div style={{ opacity: 0.7, fontSize: 12 }}>
                              No hay opciones para esta línea.
                            </div>
                          )}

                          {opts.map((it: any) => {
                            const itId = String(it.quote_item_id);
                            const isSelected = selectedId === itId;
                            const busy =
                              saving?.startsWith("select:") &&
                              saving.includes(lid) &&
                              saving.includes(itId);

                            return (
                              <div
                                key={itId}
                                className="ltOptionRow"
                                style={{
                                  border: isSelected
                                    ? "1px solid var(--primary-300)"
                                    : "1px solid var(--border)",
                                  background: isSelected ? "var(--primary-50)" : "white"
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, display: "flex", gap: 8, alignItems: "baseline" }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {(it.brand ?? "-") + " " + (it.model ?? "")}
                                    </span>
                                    <span style={{ opacity: 0.7, fontSize: 12 }}>
                                      {it.load_speed ?? ""}
                                    </span>
                                  </div>
                                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                                    {it.provider ? `${it.provider}` : "Proveedor -"}
                                    {it.sku ? ` · SKU ${it.sku}` : ""}
                                    {it.stock != null ? ` · Stock ${it.stock}` : ""}
                                  </div>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontWeight: 900 }}>
                                    ${(Number(it.price_each ?? 0)).toFixed(2)}
                                  </div>
                                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                                    total ${(Number(it.total_with_services ?? it.total_tires ?? 0)).toFixed(2)}
                                  </div>
                                </div>

                                <div>
                                  <button
                                    className={isSelected ? "btn btnPrimary" : "btn"}
                                    type="button"
                                    disabled={!!busy}
                                    onClick={() => selectWinner(lid, itId)}
                                  >
                                    {isSelected ? "Elegida" : busy ? "Guardando…" : "Elegir"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!canApprove && (
                <div className="card cardPadLg" style={{ borderColor: "var(--border)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>
                    La cotización debe estar en <span className="pill pillOk">SENT</span> para aprobar.
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    Si está en DRAFT, usa “Marcar como enviada (SENT)”.
                  </div>
                </div>
              )}

              <div className="ltDrawerFooter">
                <button className="btn" type="button" onClick={onClose}>
                  Cerrar
                </button>
                <button
                  className="btn btnPrimary"
                  type="button"
                  disabled={saving === "approve" || selectedCount === 0 || !canApprove}
                  onClick={approveAndConvert}
                >
                  {saving === "approve" ? "Aprobando…" : "Aprobar → Enviar a taller"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
