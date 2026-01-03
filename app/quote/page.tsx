"use client";

import { useMemo, useState } from "react";
import { normalizeSizeAny } from "@/lib/normalize";

function enc(s: string) {
  return encodeURIComponent(s);
}

type Line = {
  sizeInput: string;
  size: string;
  qty: number;
};

export default function QuotePage() {
  // Global settings (applies to all lines)
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
        markup,
        install,
        extras,
        minStock,
        customerName,
        customerEmail,
        customerPhone,
        vehicle
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
    a.download = `Llantitune_Cotizacion_${result.quoteId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Cotizador</h2>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label>
          Markup %
          <input type="number" value={markup} onChange={e => setMarkup(Number(e.target.value))} />
        </label>
        <label>
          Stock mínimo (regla Llantitune)
          <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} />
        </label>

        <label>
          Instalación por llanta
          <input type="number" value={install} onChange={e => setInstall(Number(e.target.value))} />
        </label>
        <label>
          Extras por llanta
          <input type="number" value={extras} onChange={e => setExtras(Number(e.target.value))} />
        </label>

        <label>
          Cliente (nombre)
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} />
        </label>
        <label>
          Vehículo (opcional)
          <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Ej. Focus" />
        </label>

        <label>
          WhatsApp (10 dígitos MX) (opcional)
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej. 4421234567" />
        </label>
        <label>
          Email (opcional)
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
          Cantidad
          <input
            type="number"
            min={1}
            step={1}
            value={lineQty}
            onChange={e => setLineQty(Math.max(1, Number(e.target.value || 1)))}
            style={{ width: "100%" }}
          />
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
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cantidad</th>
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
          <h3>Opciones</h3>\n          <div style={{ color: '#444', marginTop: -6, marginBottom: 10 }}><b>No. {result.quoteNumber}</b></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={downloadPDF}>Descargar PDF</button>
            {result.whatsappText && <a href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
            {result.emailSubject && <a href={mailtoLink}>Preparar correo</a>}
          </div>

          <details open>
            <summary>Texto WhatsApp (copiar)</summary>
            <pre style={{ background: "#f5f5f5", padding: 12, whiteSpace: "pre-wrap" }}>{result.whatsappText}</pre>
          </details>

          <details>
            <summary>Debug JSON</summary>
            <pre style={{ background: "#f5f5f5", padding: 12, overflowX: "auto" }}>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      ) : result ? (
        <div style={{ marginTop: 16, color: "#a00" }}>
          No hubo opciones con stock ≥ {minStock} para ninguna de las medidas.
        </div>
      ) : null}
    </div>
  );
}
