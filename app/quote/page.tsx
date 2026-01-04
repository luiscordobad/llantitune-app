"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Vehicle = { make: string; model: string; year: string };
type Line = { vehicleIndex: number; size: string; qty: number };

function Combobox({
  label, value, options, placeholder, disabled, onChange,
}: {
  label: string; value: string; options: string[]; placeholder?: string; disabled?: boolean; onChange: (v: string) => void;
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

  useEffect(() => setQ(""), [value]);

  return (
    <div ref={boxRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <input
        type="text"
        value={open ? q : value}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setOpen(true); setQ(e.target.value); }}
        style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: disabled ? "#f5f5f5" : "white" }}
      />
      {open && !disabled ? (
        <div style={{
          position: "absolute", top: 66, left: 0, right: 0, zIndex: 20,
          border: "1px solid #ddd", borderRadius: 12, background: "white",
          maxHeight: 260, overflow: "auto", boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
        }}>
          {filtered.length ? filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: opt === value ? "#f3f3f3" : "transparent", cursor: "pointer" }}
            >
              {opt}
            </button>
          )) : <div style={{ padding: 12, color: "#666" }}>Sin resultados</div>}
        </div>
      ) : null}
    </div>
  );
}

export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Customer (all required)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ make: "", model: "", year: "" }]);
  const [makes, setMakes] = useState<string[]>([]);
  const [modelsByVehicle, setModelsByVehicle] = useState<Record<number, string[]>>({});
  const [yearsByVehicle, setYearsByVehicle] = useState<Record<number, number[]>>({});
  const [vehicleLoading, setVehicleLoading] = useState<string>("");

  // Service/Internal
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [promisedAt, setPromisedAt] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Pricing/internal knobs
  const [markup, setMarkup] = useState<number>(30);
  const [install, setInstall] = useState<number>(1000);
  const [extras, setExtras] = useState<number>(1000);
  const [minStock, setMinStock] = useState<number>(8);

  // Lines (multi-size, per-vehicle)
  const [lines, setLines] = useState<Line[]>([{ vehicleIndex: 0, size: "", qty: 4 }]);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null); // contains quoteId, lines/options, whatsappText, etc.

  // Load makes once
  useEffect(() => {
    (async () => {
      setVehicleLoading("Cargando marcas...");
      const res = await fetch("/api/vehicle/makes");
      const d = await res.json();
      if (res.ok) setMakes(d.makes ?? []);
      setVehicleLoading("");
    })();
  }, []);

  async function loadModels(vIdx: number, make: string) {
    setVehicleLoading("Cargando modelos...");
    const res = await fetch("/api/vehicle/models?make=" + encodeURIComponent(make));
    const d = await res.json();
    if (res.ok) setModelsByVehicle((p) => ({ ...p, [vIdx]: d.models ?? [] }));
    setVehicleLoading("");
  }

  async function loadYears(vIdx: number, make: string, model: string) {
    setVehicleLoading("Cargando años...");
    const res = await fetch("/api/vehicle/years?make=" + encodeURIComponent(make) + "&model=" + encodeURIComponent(model));
    const d = await res.json();
    if (res.ok) setYearsByVehicle((p) => ({ ...p, [vIdx]: d.years ?? [] }));
    setVehicleLoading("");
  }

  function setVehicle(vIdx: number, patch: Partial<Vehicle>) {
    setVehicles((prev) => prev.map((v, i) => (i === vIdx ? { ...v, ...patch } : v)));
  }

  function addVehicle() {
    const idx = vehicles.length;
    setVehicles((p) => [...p, { make: "", model: "", year: "" }]);
    // also add a default line for that vehicle
    setLines((p) => [...p, { vehicleIndex: idx, size: "", qty: 1 }]);
  }

  function removeVehicle(vIdx: number) {
    if (vehicles.length === 1) return;
    setVehicles((prev) => prev.filter((_, i) => i !== vIdx));
    // re-map lines
    setLines((prev) =>
      prev
        .filter((l) => l.vehicleIndex !== vIdx)
        .map((l) => ({
          ...l,
          vehicleIndex: l.vehicleIndex > vIdx ? l.vehicleIndex - 1 : l.vehicleIndex,
        }))
    );
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { vehicleIndex: 0, size: "", qty: 1 }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function canNextFromStep1() {
    return customerName.trim().length >= 2 && customerEmail.trim().includes("@") && customerPhone.trim().length >= 7;
  }
  function canNextFromStep2() {
    return vehicles.every((v) => v.make && v.model && v.year);
  }
  function canNextFromStep4() {
    const validLines = lines.some((l) => l.size.trim() && (Number(l.qty) || 0) >= 1);
    return validLines;
  }
  function canGoToStep5() {
    // require selections for each line that has options
    if (!result?.lines?.length) return false;
    return result.lines.every((ln: any) => !ln.options?.length || !!ln.selectedQuoteItemId);
  }

  async function generateQuoteDraft() {
    setStatus("Cotizando (borrador)...");
    setResult(null);

    // Validate required
    if (!canNextFromStep1()) return setStatus("Completa cliente (nombre, teléfono, email).");
    if (!canNextFromStep2()) return setStatus("Completa vehículo(s): marca, modelo y año.");
    if (!canNextFromStep4()) return setStatus("Pon al menos una medida y cantidad.");

    const cleanLines = lines
      .map((l) => ({ ...l, size: l.size.trim(), qty: Number(l.qty) || 0 }))
      .filter((l) => l.size && l.qty >= 1);

    // Attach vehicle fields per line
    const payloadLines = cleanLines.map((l) => {
      const v = vehicles[l.vehicleIndex];
      return { size: l.size, qty: l.qty, vehicleMake: v.make, vehicleModel: v.model, vehicleYear: Number(v.year) };
    });

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: payloadLines,
        markup, install, extras, minStock,
        customerName, customerEmail, customerPhone,
        // header vehicle kept for backward compat but not used for multi
        vehicle: vehicles.length === 1 ? `${vehicles[0].make} ${vehicles[0].model} ${vehicles[0].year}` : `${vehicles.length} vehículos`,
        depositAmount: depositAmount === "" ? null : Number(depositAmount),
        promisedAt: promisedAt || null,
        internalNotes: internalNotes || null,
      }),
    });

    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));

    // Important: quoteNumber should be null until SENT; show temp label
    d.quoteNumber = d.quoteNumber ?? "BORRADOR (sin folio)";
    setResult(d);
    setStatus("Borrador listo ✅ Ahora selecciona llantas por medida y continúa.");
    setStep(5);
  }

  async function chooseOption(quoteLineId: string, quoteItemId: string) {
    setStatus("Guardando selección...");
    const res = await fetch("/api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteLineId, quoteItemId }),
    });
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));

    // Update local state
    setResult((prev: any) => {
      if (!prev) return prev;
      const lines = (prev.lines ?? []).map((ln: any) =>
        ln.lineId === quoteLineId ? { ...ln, selectedQuoteItemId: quoteItemId } : ln
      );
      return { ...prev, lines };
    });

    setStatus("Selección guardada ✅");
  }

  async function markSent() {
    if (!result?.quoteId) return;
    if (!canGoToStep5()) return setStatus("Selecciona una opción por cada medida antes de enviar.");
    setStatus("Marcando ENVIADA y asignando folio...");
    const res = await fetch("/api/admin/quote/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: result.quoteId, status: "SENT" }),
    });
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    // refresh quote info if endpoint returns quote_number; if not, keep and suggest refresh
    setStatus("ENVIADA ✅ (folio asignado). Si no ves el folio, recarga la página.");
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
    1: "1) Datos del cliente (obligatorio)",
    2: "2) Vehículo(s) (obligatorio)",
    3: "3) Anticipo / fecha promesa / notas (interno)",
    4: "4) Medidas y cantidades",
    5: "5) Elegir llantas y enviar",
  }[step];

  return (
    <div style={{ maxWidth: 1040 }}>
      <h2>Cotizador Llantitune</h2>
      <div style={{ color: "#666", marginTop: -8 }}>Flujo guiado: cliente → vehículo(s) → internos → medidas → elegir y enviar</div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((s) => (
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
          {step === 1 && "Nombre, teléfono y email son obligatorios para poder enviar."}
          {step === 2 && "Puedes agregar más de un vehículo (por ejemplo, del mismo cliente)."}
          {step === 3 && "Interno: anticipo, promesa, notas. Se guarda en la orden."}
          {step === 4 && "Agrega medidas por vehículo. Cantidad se escribe manual y se limita por stock."}
          {step === 5 && "Ves lo disponible, eliges la opción por medida y luego la ENVIAS (folio se asigna al enviar)."}
        </div>
      </div>

      <div style={{ marginTop: 12, color: "#555" }}>{status}</div>
      {vehicleLoading ? <div style={{ marginTop: 6, color: "#666" }}>{vehicleLoading}</div> : null}

      {/* STEP 1 */}
      {step === 1 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Nombre*</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Teléfono*</span>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / span 2" }}>
              <span style={{ fontWeight: 600 }}>Email*</span>
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

      {/* STEP 2 Vehicles */}
      {step === 2 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Vehículos</h3>
            <button type="button" onClick={addVehicle} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
              + Agregar vehículo
            </button>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {vehicles.map((v, idx) => (
              <div key={idx} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <b>Vehículo #{idx + 1}</b>
                  {vehicles.length > 1 ? (
                    <button type="button" onClick={() => removeVehicle(idx)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
                      Quitar
                    </button>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 0.7fr", marginTop: 10 }}>
                  <Combobox
                    label="Marca*"
                    value={v.make}
                    options={makes}
                    placeholder="Ej. Ford"
                    onChange={async (val) => {
                      setVehicle(idx, { make: val, model: "", year: "" });
                      setModelsByVehicle((p) => ({ ...p, [idx]: [] }));
                      setYearsByVehicle((p) => ({ ...p, [idx]: [] }));
                      await loadModels(idx, val);
                    }}
                  />
                  <Combobox
                    label="Modelo*"
                    value={v.model}
                    options={modelsByVehicle[idx] ?? []}
                    placeholder={v.make ? "Ej. Focus" : "Primero elige marca"}
                    disabled={!v.make}
                    onChange={async (val) => {
                      setVehicle(idx, { model: val, year: "" });
                      setYearsByVehicle((p) => ({ ...p, [idx]: [] }));
                      await loadYears(idx, v.make, val);
                    }}
                  />
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 600 }}>Año*</label>
                    <select
                      value={v.year}
                      disabled={!v.model}
                      onChange={(e) => setVehicle(idx, { year: e.target.value })}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: !v.model ? "#f5f5f5" : "white" }}
                    >
                      <option value="">{!v.model ? "Primero elige modelo" : "Selecciona año"}</option>
                      {(yearsByVehicle[idx] ?? []).map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Fecha promesa (interno)</span>
              <input type="date" value={promisedAt} onChange={(e) => setPromisedAt(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / span 2" }}>
              <span style={{ fontWeight: 600 }}>Notas internas (interno)</span>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minHeight: 90 }}
              />
            </label>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", color: "#333" }}>
              Ajustes de precio/servicios (interno) — normalmente no se tocan
            </summary>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Markup %</span>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Instalación</span>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={install}
                  onChange={(e) => setInstall(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Extras</span>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={extras}
                  onChange={(e) => setExtras(Number(e.target.value) || 0)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Stock mínimo</span>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={minStock}
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
            <button type="button" onClick={() => setStep(4)} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "white" }}>
              Siguiente →
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 4 */}
      {step === 4 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Medidas y cantidades (por vehículo)</h3>
            <button type="button" onClick={addLine} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
              + Agregar medida
            </button>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {lines.map((l, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 0.7fr auto", gap: 10, alignItems: "end" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontWeight: 600 }}>Vehículo</label>
                  <select
                    value={String(l.vehicleIndex)}
                    onChange={(e) => updateLine(idx, { vehicleIndex: Number(e.target.value) })}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                  >
                    {vehicles.map((v, i) => (
                      <option key={i} value={String(i)}>
                        #{i + 1} {v.make} {v.model} {v.year}
                      </option>
                    ))}
                  </select>
                </div>

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
              onClick={generateQuoteDraft}
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
              Ver llantas disponibles →
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 5 */}
      {step === 5 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          {!result ? (
            <div style={{ color: "#666" }}>Primero genera el borrador en el Paso 4.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18 }}><b>{result.quoteNumber ?? "BORRADOR (sin folio)"}</b></div>
                  <div style={{ color: "#666" }}>{customerName} — {customerPhone} — {customerEmail}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={copyWhatsappText}>Copiar WhatsApp</button>
                  <button type="button" onClick={downloadPDF}>Descargar PDF</button>
                  <button
                    type="button"
                    onClick={markSent}
                    disabled={!canGoToStep5()}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid #111",
                      background: canGoToStep5() ? "#111" : "#ddd",
                      color: canGoToStep5() ? "white" : "#666",
                      cursor: canGoToStep5() ? "pointer" : "not-allowed",
                    }}
                  >
                    Enviar (asigna folio)
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                {(result.lines ?? []).map((line: any) => (
                  <div key={line.lineId} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div><b>Medida:</b> {line.size} &nbsp; <b>Solicitado:</b> {line.requestedQty}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                          <b>Vehículo:</b> {line.vehicleMake ?? ""} {line.vehicleModel ?? ""} {line.vehicleYear ?? ""}
                        </div>
                        {line.notice ? <div style={{ color: "#b45309", marginTop: 6 }}><b>Nota:</b> {line.notice}</div> : null}
                      </div>
                      {line.selectedQuoteItemId ? <div style={{ color: "#16a34a" }}><b>Elegida ✅</b></div> : <div style={{ color: "#b45309" }}><b>Falta elegir</b></div>}
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
                                  <button
                                    type="button"
                                    onClick={() => chooseOption(line.lineId, o.quoteItemId)}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: 10,
                                      border: "1px solid #111",
                                      background: line.selectedQuoteItemId === o.quoteItemId ? "#111" : "white",
                                      color: line.selectedQuoteItemId === o.quoteItemId ? "white" : "#111",
                                    }}
                                  >
                                    {line.selectedQuoteItemId === o.quoteItemId ? "Elegida" : "Elegir"}
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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
