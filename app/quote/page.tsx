"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeSizeAny } from "@/lib/normalize";

function enc(s: string) { return encodeURIComponent(s); }

type Line = { sizeInput: string; size: string; qty: number; };

export default function QuotePage() {
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // Internal settings (admin-only)
  const [markup, setMarkup] = useState(30);
  const [install, setInstall] = useState(1000);
  const [extras, setExtras] = useState(1000);
  const [minStock, setMinStock] = useState(8);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  // Lines (cart)
  const [lineSizeInput, setLineSizeInput] = useState("");
  const normalized = useMemo(() => normalizeSizeAny(lineSizeInput) ?? "", [lineSizeInput]);
  const [lineQty, setLineQty] = useState<number>(4);
  const [lines, setLines] = useState<Line[]>([]);

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const s = data.settings ?? {};
      setMarkup(Number(s.default_markup_pct ?? 30));
      setInstall(Number(s.default_install_each ?? 1000));
      setExtras(Number(s.default_extras_each ?? 1000));
      setMinStock(Number(s.default_min_stock ?? 8));
      setLoadingDefaults(false);

      const params = new URLSearchParams(window.location.search);
      const requote = params.get("requote");
      if (requote) {
        const rr = await fetch("/api/requote?quoteId=" + encodeURIComponent(requote));
        const rj = await rr.json();
        if (rr.ok) {
          setCustomerName(rj.customerName ?? "");
          setCustomerPhone(rj.customerPhone ?? "");
          setCustomerEmail(rj.customerEmail ?? "");
          setVehicle(rj.vehicle ?? "");
          setLines((rj.lines ?? []).map((l: any) => ({ sizeInput: l.size, size: l.size, qty: l.qty })));
        }
      }
    })();
  }, []);

  function addLine() {
    const size = normalized;
    if (!size) return;
    const qty = Math.max(1, Number(lineQty || 1));
    setLines(prev => [...prev, { sizeInput: lineSizeInput, size, qty }]);
    setLineSizeInput("");
    setLineQty(4);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function runQuote() {
    if (!lines.length) {
      setStatus("Agrega al menos 1 medida a la cotización.");
      return;
    }
    setStatus("Cotizando...");
    setResult(null);

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: lines.map(l => ({ size: l.size, qty: l.qty })),
        markup, install, extras, minStock,
        customerName, customerEmail, customerPhone, vehicle
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error ?? "unknown"}`);
      return;
    }
    setResult(data);
    setStatus("OK ✅");
  }

  async function selectOption(lineId: string, quoteItemId: string) {
    if (!result?.quoteId) return;
    setStatus("Guardando selección...");
    const res = await fetch("/api/quote/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: result.quoteId, lineId, quoteItemId })
    });
    const data = await res.json();
    if (!res.ok) return setStatus("Error: " + (data.error ?? "unknown"));
    setStatus("OK ✅ Selección guardada. Ya puedes ver el pedido interno.");
  }

  const whatsappLink = useMemo(() => {
    if (!result?.whatsappText) return "";
    const phone = (customerPhone ?? "").replace(/\D/g, "");
    const base = phone ? `https://wa.me/52${phone}` : "https://wa.me/";
    return `${base}?text=${enc(result.whatsappText)}`;
  }, [result, customerPhone]);

  const mailtoLink = useMemo(() => {
    if (!result?.emailSubject || !result?.emailBody) return "";
    const to = customerEmail || "";
    return `mailto:${to}?subject=${enc(result.emailSubject)}&body=${enc(result.emailBody)}`;
  }, [result, customerEmail]);

  async function downloadPDF() {
    if (!result?.quoteId) return;
    const res = await fetch(`/api/quote/pdf?quoteId=${enc(result.quoteId)}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Llantitune_Cotizacion_${result.quoteNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 1150 }}>
      <h2>Cotizador (Admin)</h2>

      {loadingDefaults ? <div style={{ color: "#666" }}>Cargando defaults...</div> : null}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label>Markup % (interno)
          <input type="number" value={markup} onChange={e => setMarkup(Number(e.target.value))} />
        </label>
        <label>Stock mínimo (interno)
          <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} />
        </label>

        <label>Instalación por llanta (interno)
          <input type="number" value={install} onChange={e => setInstall(Number(e.target.value))} />
        </label>
        <label>Extras por llanta (interno)
          <input type="number" value={extras} onChange={e => setExtras(Number(e.target.value))} />
        </label>

        <label>Cliente (nombre)
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} />
        </label>
        <label>Vehículo (opcional)
          <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Ej. Focus 2013" />
        </label>

        <label>WhatsApp (10 dígitos MX) (opcional)
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej. 4421234567" />
        </label>
        <label>Email (opcional)
          <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="cliente@email.com" />
        </label>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h3>Medidas en la cotización</h3>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 160px 140px" }}>
        <label style={{ gridColumn: "1 / 2" }}>
          Tamaño (ej. 215/55R16 o 165/60/R13)
          <input value={lineSizeInput} onChange={e => setLineSizeInput(e.target.value)} style={{ width: "100%" }} />
          <div style={{ fontSize: 12, color: "#666" }}>Normalizado: <b>{normalized || "-"}</b></div>
        </label>
        <label style={{ gridColumn: "2 / 3" }}>
          Cantidad solicitada
          <input type="number" min={1} step={1} value={lineQty}
            onChange={e => setLineQty(Math.max(1, Number(e.target.value || 1)))} style={{ width: "100%" }} />
        </label>
        <div style={{ gridColumn: "3 / 4", display: "flex", alignItems: "flex-end" }}>
          <button onClick={addLine} style={{ width: "100%" }}>Agregar</button>
        </div>
      </div>

      {lines.length ? (
        <div style={{ marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Tamaño</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cantidad solicitada</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{l.size}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{l.qty}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    <button onClick={() => removeLine(idx)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: "#666" }}>Agrega una o más medidas arriba.</div>
      )}

      <button style={{ marginTop: 16 }} onClick={runQuote}>Cotizar</button>
      <div style={{ marginTop: 10, color: "#555" }}>{status}</div>

      {result?.hasAnyOptions ? (
        <div style={{ marginTop: 16 }}>
          <h3>Opciones</h3>
          <div style={{ color: "#444", marginTop: -6, marginBottom: 10 }}><b>No. {result.quoteNumber}</b></div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={downloadPDF}>Descargar PDF</button>
            {result.whatsappText && <a href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
            {result.emailSubject && <a href={mailtoLink}>Preparar correo</a>}
            {result.quoteId && <a href={`/admin/orders?quoteId=${result.quoteId}`}>Ver pedido interno</a>}
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12, color: "#555" }}>
            <b>¿Cómo funciona “Elegir esta opción”?</b>
            <div style={{ marginTop: 6 }}>
              1) Selecciona una opción por cada medida (fila).<br/>
              2) Se guarda en la cotización y se genera el <b>pedido interno</b> con SKU/proveedor/costo (solo Admin).<br/>
              3) Si la opción tiene stock menor a lo solicitado, se cotiza solo lo disponible.
            </div>
          </div>

          {(result.lines ?? []).map((ln: any) => (
            <div key={ln.lineId} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{ln.size}</b> <span style={{ color: "#666" }}>(Solicitado x{ln.requestedQty})</span>
                </div>
                {ln.anyLimited ? <div style={{ color: "#a60" }}>⚠️ Algunas opciones tienen stock limitado</div> : null}
              </div>

              {(ln.options ?? []).length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>#</th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Gama</th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Marca</th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Load</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Precio c/u</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Total</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Stock</th>
                      <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ln.options ?? []).map((o: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>#{idx + 1}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}><b>{o.tier}</b></td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{o.brand}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{o.loadSpeed ?? ""}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>${o.priceEach}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>${o.totalWithServices}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                          {o.limited ? <span style={{ color: "#a60" }}>x{o.quotedQty} (stock {o.stock})</span> : `x${o.stock}`}
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                          {o.quoteItemId ? (
                            <button onClick={() => selectOption(ln.lineId, o.quoteItemId)}>Elegir</button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ marginTop: 10, color: "#666" }}>Sin opciones.</div>
              )}
            </div>
          ))}

          <details open>
            <summary>Texto WhatsApp (copiar)</summary>
            <pre style={{ background: "#f5f5f5", padding: 12, whiteSpace: "pre-wrap" }}>{result.whatsappText}</pre>
          </details>
        </div>
      ) : result ? (
        <div style={{ marginTop: 16, color: "#a00" }}>
          No hubo opciones con stock suficiente para ninguna de las medidas.
        </div>
      ) : null}
    </div>
  );
}
