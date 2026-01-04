"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QuoteLine = { size: string; qty: number };

function Combobox({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = options ?? [];
    if (!query) return base.slice(0, 80);
    return base.filter((x) => x.toLowerCase().includes(query)).slice(0, 80);
  }, [options, q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    // keep search aligned with value
    setQ("");
  }, [value]);

  return (
    <div ref={boxRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <input
        type="text"
        value={open ? q : value}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          setQ(e.target.value);
        }}
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid #ddd",
          background: disabled ? "#f5f5f5" : "white",
        }}
      />
      {open && !disabled ? (
        <div
          style={{
            position: "absolute",
            top: 66,
            left: 0,
            right: 0,
            zIndex: 20,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "white",
            maxHeight: 260,
            overflow: "auto",
            boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length ? (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: opt === value ? "#f3f3f3" : "transparent",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))
          ) : (
            <div style={{ padding: 12, color: "#666" }}>Sin resultados</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function QuotePage() {
  // STEP state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Vehicle (required)
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");

  // Catalog options
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState<string>("");

  // Service/Internal
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [promisedAt, setPromisedAt] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Quote lines
  const [lines, setLines] = useState<QuoteLine[]>([{ size: "", qty: 4 }]);
  const [markup, setMarkup] = useState<number>(30);
  const [install, setInstall] = useState<number>(1000);
  const [extras, setExtras] = useState<number>(1000);
  const [minStock, setMinStock] = useState<number>(8);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);

  // Load vehicle makes
  useEffect(() => {
    (async () => {
      setVehicleLoading("Cargando marcas...");
      const res = await fetch("/api/vehicle/makes");
      const d = await res.json();
      if (res.ok) setMakes(d.makes ?? []);
      setVehicleLoading("");
    })();
  }, []);

  // Load models when make changes
  useEffect(() => {
    (async () => {
      setModel("");
      setYear("");
      setModels([]);
      setYears([]);
      if (!make) return;
      setVehicleLoading("Cargando modelos...");
      const res = await fetch("/api/vehicle/models?make=" + encodeURIComponent(make));
      const d = await res.json();
      if (res.ok) setModels(d.models ?? []);
      setVehicleLoading("");
    })();
  }, [make]);

  // Load years when model changes
  useEffect(() => {
    (async () => {
      setYear("");
      setYears([]);
      if (!make || !model) return;
      setVehicleLoading("Cargando años...");
      const res = await fetch(
        "/api/vehicle/years?make=" +
          encodeURIComponent(make) +
          "&model=" +
          encodeURIComponent(model)
      );
      const d = await res.json();
      if (res.ok) setYears(d.years ?? []);
      setVehicleLoading("");
    })();
  }, [make, model]);

  function canNextFromStep1() {
    return customerName.trim().length >= 2;
  }
  function canNextFromStep2() {
    return make && model && year;
  }
  function canNextFromStep3() {
    return true;
  }
  function canNextFromStep4() {
    // At least one valid line with size and qty>=1
    const valid = lines.some((l) => l.size.trim() && (Number(l.qty) || 0) >= 1);
    return valid;
  }

  function updateLine(i: number, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { size: "", qty: 1 }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generateQuote() {
    setStatus("Cotizando...");
    setResult(null);

    const cleanLines = lines
      .map((l) => ({ size: l.size.trim(), qty: Number(l.qty) || 0 }))
      .filter((l) => l.size && l.qty >= 1);

    if (!cleanLines.length) {
      setStatus("Pon al menos una medida y cantidad.");
      return;
    }

    // Vehicle required
    if (!make || !model || !year) {
      setStatus("Completa vehículo (Marca/Modelo/Año).");
      return;
    }

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: cleanLines,
        markup,
        install,
        extras,
        minStock,
        customerName,
        customerEmail,
        customerPhone,
        // keep original vehicle_text for display, and store structured fields
        vehicle: `${make} ${model} ${year}`,
        vehicleMake: make,
        vehicleModel: model,
        vehicleYear: Number(year),
        depositAmount: depositAmount === "" ? null : Number(depositAmount),
        promisedAt: promisedAt || null,
        internalNotes: internalNotes || null,
      }),
    });

    const d = await res.json();
    if (!res.ok) {
      setStatus("Error: " + (d.error ?? "unknown"));
      return;
    }
    setResult(d);
    setStatus("OK ✅");
    setStep(4);
  }

  async function setQuoteStatus(newStatus: "SENT" | "APPROVED" | "REJECTED") {
    if (!result?.quoteId) return;
    setStatus("Actualizando estatus...");
    const res = await fetch("/api/admin/quote/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: result.quoteId, status: newStatus }),
    });
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    setStatus("OK ✅ Estatus actualizado.");
  }

  async function downloadPDF() {
    if (!result?.quoteId) return;
    const res = await fetch("/api/pdf?quoteId=" + encodeURIComponent(result.quoteId));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (result?.quoteNumber ?? "cotizacion") + ".pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyWhatsappText() {
    if (!result?.whatsappText) return;
    navigator.clipboard.writeText(result.whatsappText);
    setStatus("Texto copiado ✅");
  }

  const stepTitle = {
    1: "1) Datos del cliente",
    2: "2) Vehículo (obligatorio)",
    3: "3) Servicio e internos",
    4: "4) Cotización",
  }[step];

  return (
    <div style={{ maxWidth: 980 }}>
      <h2>Cotizador Llantitune</h2>
      <div style={{ color: "#666", marginTop: -8 }}>Flujo guiado: cliente → vehículo → internos → cotización</div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s as any)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: step === s ? "#111" : "white",
              color: step === s ? "white" : "#111",
              cursor: "pointer",
            }}
          >
            Paso {s}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: 14, border: "1px solid #eee", borderRadius: 14, background: "#fafafa" }}>
        <b>{stepTitle}</b>
        <div style={{ color: "#666", marginTop: 6 }}>
          {step === 1 && "Captura lo mínimo. Puedes dejar email/teléfono en blanco si el cliente no quiere."}
          {step === 2 && "Selecciona marca → modelo → año con buscador."}
          {step === 3 && "Estos datos son internos (anticipo, promesa, notas). Se ven en admin y en orden de trabajo."}
          {step === 4 && "Agrega una o varias medidas. La cantidad es manual y se limita por stock."}
        </div>
      </div>

      <div style={{ marginTop: 12, color: "#555" }}>{status}</div>

      {/* STEP 1 */}
      {step === 1 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Nombre*</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Teléfono (opcional)</span>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / span 2" }}>
              <span style={{ fontWeight: 600 }}>Email (opcional)</span>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <div />
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canNextFromStep1()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: canNextFromStep1() ? "#111" : "#ddd",
                color: canNextFromStep1() ? "white" : "#666",
                cursor: canNextFromStep1() ? "pointer" : "not-allowed",
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 2 */}
      {step === 2 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <Combobox label="Marca*" value={make} options={makes} placeholder="Ej. Ford" onChange={setMake} />
            <Combobox label="Modelo*" value={model} options={models} placeholder={make ? "Ej. Focus" : "Primero elige marca"} disabled={!make} onChange={setModel} />
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 600 }}>Año*</label>
              <select
                value={year}
                disabled={!model}
                onChange={(e) => setYear(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: !model ? "#f5f5f5" : "white" }}
              >
                <option value="">{!model ? "Primero elige modelo" : "Selecciona año"}</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {vehicleLoading ? <div style={{ marginTop: 10, color: "#666" }}>{vehicleLoading}</div> : null}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button type="button" onClick={() => setStep(1)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
              ← Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canNextFromStep2()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: canNextFromStep2() ? "#111" : "#ddd",
                color: canNextFromStep2() ? "white" : "#666",
                cursor: canNextFromStep2() ? "pointer" : "not-allowed",
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 3 */}
      {step === 3 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Anticipo (MXN) (interno)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Fecha promesa (interno)</span>
              <input type="date" value={promisedAt} onChange={(e) => setPromisedAt(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / span 2" }}>
              <span style={{ fontWeight: 600 }}>Notas internas (interno)</span>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minHeight: 90 }} />
            </label>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", color: "#333" }}>
              Ajustes de precio/servicios (interno) — normalmente no se tocan
            </summary>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Markup %</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Instalación</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={install}
                  onChange={(e) => setInstall(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Extras</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={extras}
                  onChange={(e) => setExtras(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Stock mínimo</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
            </div>
          </details>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button type="button" onClick={() => setStep(2)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
              ← Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={!canNextFromStep3()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "white",
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 4 */}
      {step === 4 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "#444" }}>
              <b>Vehículo:</b> {make} {model} {year}
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Medidas solicitadas</h3>
                <button type="button" onClick={addLine} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
                  + Agregar medida
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {lines.map((l, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr auto", gap: 10, alignItems: "end" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>Medida (ej. 215/55R16)</span>
                      <input value={l.size} onChange={(e) => updateLine(idx, { size: e.target.value })} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>Cantidad</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={l.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                      />
                      <div style={{ color: "#666", fontSize: 12 }}>Mínimo 1</div>
                    </label>
                    <div>
                      {lines.length > 1 ? (
                        <button type="button" onClick={() => removeLine(idx)} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #eee", background: "#fff" }}>
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button type="button" onClick={() => setStep(3)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
                  ← Atrás
                </button>
                <button
                  type="button"
                  onClick={generateQuote}
                  disabled={!canNextFromStep4()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: canNextFromStep4() ? "#111" : "#ddd",
                    color: canNextFromStep4() ? "white" : "#666",
                    cursor: canNextFromStep4() ? "pointer" : "not-allowed",
                  }}
                >
                  Generar cotización
                </button>
              </div>
            </div>

            {result ? (
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18 }}><b>{result.quoteNumber}</b></div>
                    <div style={{ color: "#666" }}>{customerName} — {make} {model} {year}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setQuoteStatus("SENT")}>Marcar ENVIADA</button>
                    <button type="button" onClick={() => setQuoteStatus("APPROVED")}>Marcar APROBADA</button>
                    <button type="button" onClick={() => setQuoteStatus("REJECTED")}>Marcar RECHAZADA</button>
                    <button type="button" onClick={copyWhatsappText}>Copiar WhatsApp</button>
                    <button type="button" onClick={downloadPDF}>Descargar PDF</button>
                  </div>
                </div>

                {/* Render all lines and options (list) */}
                <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                  {(result.lines ?? []).map((line: any) => (
                    <div key={line.lineId} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, background: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <b>Medida:</b> {line.size} &nbsp; <b>Solicitado:</b> {line.requestedQty}
                          {line.notice ? <div style={{ color: "#b45309", marginTop: 6 }}><b>Nota:</b> {line.notice}</div> : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {line.options?.length ? (
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Gama</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Marca</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Modelo</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Load</th>
                                <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Stock</th>
                                <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Cotizable</th>
                                <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Precio c/u</th>
                                <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Total</th>
                                <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {line.options.map((o: any) => (
                                <tr key={o.quoteItemId ?? `${o.rank}-${o.sku}`}>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}><b>{o.tierLabel}</b></td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.brand}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.model}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.loadSpeed ?? ""}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{o.stock}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                                    {o.quotedQty}{o.limited ? <span style={{ color: "#b45309" }}> *</span> : null}
                                  </td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>${o.priceEach.toFixed(2)}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>${o.totalTires.toFixed(2)}</td>
                                  <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                                    <button type="button" onClick={async () => {
                                      setStatus("Guardando selección...");
                                      const res = await fetch("/api/select", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ quoteLineId: line.lineId, quoteItemId: o.quoteItemId })
                                      });
                                      const d = await res.json();
                                      if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
                                      setStatus("Selección guardada ✅");
                                    }}>
                                      Elegir
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ color: "#666" }}>Sin opciones con stock mínimo.</div>
                        )}
                        <div style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
                          * Si aparece asterisco, la cantidad cotizable se limitó por stock.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
