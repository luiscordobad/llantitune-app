"use client";

import { useMemo, useState } from "react";

type QuoteRow = {
  quote_id: string;
  quote_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  vehicle_text: string | null;
  status: string | null;
};

type QuoteLine = {
  line_id: string;
  quote_id: string | null;
  line_no: number | null;
  size: string | null;
  quantity: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  selected_quote_item_id: string | null;
};

type QuoteItem = {
  quote_item_id: string;
  quote_id: string | null;
  line_id: string | null;
  quote_line_id: string | null;
  provider: string | null;
  sku: string | null;
  brand: string | null;
  model: string | null;
  load_speed: string | null;
  size: string | null;
  stock: number | null;
  price_each: number | null;
  total_with_services: number | null;
  included: boolean | null;
};

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function lineVehicleText(ln: QuoteLine) {
  const parts = [ln.vehicle_make, ln.vehicle_model, ln.vehicle_year]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join(" ") : "—";
}

export default function QuoteDetailClient({
  quote,
  lines,
  items,
}: {
  quote: QuoteRow;
  lines: QuoteLine[];
  items: QuoteItem[];
}) {
  const grouped = useMemo(() => {
    const byLine: Record<string, { line: QuoteLine; options: QuoteItem[] }> = {};
    const lineOrder = [...(lines ?? [])].sort((a, b) => (a.line_no ?? 0) - (b.line_no ?? 0));

    for (const ln of lineOrder) {
      byLine[ln.line_id] = { line: ln, options: [] };
    }

    for (const it of items ?? []) {
      const lid = it.line_id ?? it.quote_line_id;
      if (!lid) continue;
      if (!byLine[lid]) {
        // In case the line record was not fetched for some reason
        byLine[lid] = {
          line: {
            line_id: lid,
            quote_id: quote.quote_id,
            line_no: null,
            size: it.size ?? null,
            quantity: null,
            vehicle_make: null,
            vehicle_model: null,
            vehicle_year: null,
            selected_quote_item_id: null,
          },
          options: [],
        };
      }
      byLine[lid].options.push(it);
    }

    // Prefer included options. If a line has zero included options, fallback to showing all.
    for (const lid of Object.keys(byLine)) {
      const opts = byLine[lid].options;
      const included = opts.filter((o) => o.included === true);
      byLine[lid].options = included.length ? included : opts;
    }

    return Object.values(byLine);
  }, [lines, items, quote.quote_id]);

  const initialSelected = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of grouped) {
      const ln = g.line;
      const opts = g.options;
      if (!opts.length) continue;
      const explicit = ln.selected_quote_item_id;
      if (explicit && opts.some((o) => o.quote_item_id === explicit)) {
        m[ln.line_id] = explicit;
        continue;
      }
      const firstIncluded = opts.find((o) => o.included === true);
      m[ln.line_id] = (firstIncluded ?? opts[0]).quote_item_id;
    }
    return m;
  }, [grouped]);

  const [selectedByLine, setSelectedByLine] = useState<Record<string, string>>(initialSelected);
  const [busy, setBusy] = useState<null | "save" | "workorder">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveSelections() {
    setBusy("save");
    setMsg(null);
    try {
      const entries = Object.entries(selectedByLine).filter(([, v]) => !!v);
      for (const [lineId, quoteItemId] of entries) {
        const res = await fetch("/api/quotes/select-item", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quote_id: quote.quote_id, line_id: lineId, quote_item_id: quoteItemId }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Failed to save selection for line ${lineId}`);
        }
      }
      setMsg("Selección guardada.");
    } catch (e: any) {
      setMsg(e?.message ?? "Error saving selection");
    } finally {
      setBusy(null);
    }
  }

  async function createWorkOrder() {
    setBusy("workorder");
    setMsg(null);
    try {
      // Ensure selections are persisted first
      await saveSelections();

      const res = await fetch("/api/quotes/approve-and-convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quote_id: quote.quote_id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to create work order");
      }

      // Redirect to the new work order
      if (data?.orderId) {
        window.location.href = `/admin/work-orders/${data.orderId}`;
        return;
      }
      setMsg("Work order creada.");
    } catch (e: any) {
      setMsg(e?.message ?? "Error creating work order");
    } finally {
      setBusy(null);
    }
  }

  const total = useMemo(() => {
    let t = 0;
    for (const g of grouped) {
      const lid = g.line.line_id;
      const sel = selectedByLine[lid];
      const it = g.options.find((o) => o.quote_item_id === sel);
      const v = Number(it?.total_with_services ?? it?.price_each);
      if (Number.isFinite(v)) t += v;
    }
    return t;
  }, [grouped, selectedByLine]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            Cotización #{quote.quote_number ?? quote.quote_id}
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Cliente: <b>{quote.customer_name || "—"}</b> | Email: <b>{quote.customer_email || "—"}</b> | Vehículo:{" "}
            <b>{quote.vehicle_text || "—"}</b> | Estatus: <b>{quote.status || "—"}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/admin/quotes" style={{ textDecoration: "none" }}>
            <button style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d0d7de" }}>← Back</button>
          </a>
          <button
            onClick={createWorkOrder}
            disabled={busy !== null || grouped.length === 0}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #16a34a",
              background: "#16a34a",
              color: "white",
              fontWeight: 600,
            }}
          >
            {busy === "workorder" ? "Creating..." : "Create Work Order"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Included options</div>
          <div style={{ opacity: 0.7 }}>Pick 1 option per line. Then click “Create Work Order”.</div>
        </div>

        {grouped.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.8 }}>No options found for this quote.</div>
        ) : (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {grouped.map(({ line: ln, options }) => {
              const lid = ln.line_id;
              const selected = selectedByLine[lid] || "";
              const title = `Line ${ln.line_no ?? ""}: ${ln.size ?? "—"} x${ln.quantity ?? 1}`;
              return (
                <div key={lid} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{title}</div>
                      <div style={{ opacity: 0.75, marginTop: 2 }}>{lineVehicleText(ln)}</div>
                    </div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>Line ID: {lid.slice(0, 8)}...</div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {options.map((it) => {
                      const label = [it.brand, it.model, it.load_speed].filter(Boolean).join(" ") || "Opción";
                      return (
                        <label
                          key={it.quote_item_id}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid #e5e7eb",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name={`line_${lid}`}
                            checked={selected === it.quote_item_id}
                            onChange={() =>
                              setSelectedByLine((prev) => ({
                                ...prev,
                                [lid]: it.quote_item_id,
                              }))
                            }
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 650 }}>{label}</div>
                            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>
                              Provider: {it.provider || "—"} | SKU: {it.sku || "—"} | Stock: {it.stock ?? "—"}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700 }}>{money(it.total_with_services ?? it.price_each)}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
              <div style={{ marginRight: "auto", fontWeight: 700 }}>Total: {money(total)}</div>
              {msg ? <div style={{ opacity: 0.85 }}>{msg}</div> : null}
              <button
                onClick={saveSelections}
                disabled={busy !== null}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d0d7de" }}
              >
                {busy === "save" ? "Saving..." : "Guardar selección"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        Tip: When the customer confirms (e.g., “ZMAX”), select that option on its line and click “Create Work Order”. This
        sets <code>quote_lines.selected_quote_item_id</code>, keeps only the chosen option as <code>included</code> for that
        line, and creates a Work Order.
      </div>
    </div>
  );
}
