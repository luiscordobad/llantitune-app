"use client";

import { useMemo, useState } from "react";
import { normalizeSizeAny } from "@/lib/normalize";

function enc(s: string) {
  return encodeURIComponent(s);
}

export default function QuotePage() {
  const [sizeInput, setSizeInput] = useState("");
  const size = useMemo(() => normalizeSizeAny(sizeInput) ?? "", [sizeInput]);

  const [qty, setQty] = useState(4);
  const [markup, setMarkup] = useState(30);
  const [install, setInstall] = useState(1000);
  const [extras, setExtras] = useState(1000);
  const [minStock, setMinStock] = useState(8);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  async function runQuote() {
    setStatus("Cotizando...");
    setResult(null);
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size, qty, markup, install, extras, minStock, customerName, customerEmail, customerPhone, vehicle })
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
    a.download = `Llantitune_Cotizacion_${size || "size"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Cotizador</h2>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label>
          Tamaño (ej. 215/55R16 o 165/60/R13)
          <input value={sizeInput} onChange={e => setSizeInput(e.target.value)} style={{ width: "100%" }} />
          <div style={{ fontSize: 12, color: "#666" }}>Normalizado: <b>{size || "-"}</b></div>
        </label>

        <label>
          Cantidad
          <select value={qty} onChange={e => setQty(Number(e.target.value))}>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </label>

        <label>Markup % <input type="number" value={markup} onChange={e => setMarkup(Number(e.target.value))} /></label>
        <label>Stock mínimo <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} /></label>

        <label>Instalación por llanta <input type="number" value={install} onChange={e => setInstall(Number(e.target.value))} /></label>
        <label>Extras por llanta <input type="number" value={extras} onChange={e => setExtras(Number(e.target.value))} /></label>

        <label>Cliente (nombre) <input value={customerName} onChange={e => setCustomerName(e.target.value)} /></label>
        <label>Vehículo (opcional) <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Ej. Mazda 3 2018" /></label>

        <label>WhatsApp (10 dígitos MX) (opcional) <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej. 4421234567" /></label>
        <label>Email (opcional) <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="cliente@email.com" /></label>
      </div>

      <button style={{ marginTop: 12 }} onClick={runQuote}>Cotizar</button>
      <div style={{ marginTop: 10, color: "#555" }}>{status}</div>

      {result?.options?.length ? (
        <div style={{ marginTop: 16 }}>
          <h3>Opciones</h3>

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
      ) : result?.options ? (
        <div style={{ marginTop: 16, color: "#a00" }}>No hay opciones con stock ≥ {minStock} para {size}.</div>
      ) : null}
    </div>
  );
}
