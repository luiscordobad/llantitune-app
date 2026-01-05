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

function fmtMoney(n: number) {
  return "$" + (Number.isFinite(n) ? n.toFixed(2) : "0.00");
}

export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Customer (required)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ make: "", model: "", year: "" }]);
  const [makes, setMakes] = useState<string[]>([]);
  const [modelsByVehicle, setModelsByVehicle] = useState<Record<number, string[]>>({});
  const [yearsByVehicle, setYearsByVehicle] = useState<Record<number, number[]>>({});
  const [vehicleLoading, setVehicleLoading] = useState<string>("");

  // Internal
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [promisedAt, setPromisedAt] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Internal knobs
  const [markup, setMarkup] = useState<number>(30);
  const [install, setInstall] = useState<number>(1000);
  const [extras, setExtras] = useState<number>(1000);
  const [minStock, setMinStock] = useState<number>(8);

  // Lines (multi-size, per-vehicle)
  const [lines, setLines] = useState<Line[]>([{ vehicleIndex: 0, size: "", qty: 4 }]);

  // Draft + options
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<any>(null); // quoteId, quoteNumber (draft), lines with options

  // Message customization (Step 5)
  const [msgIntro, setMsgIntro] = useState("Hola 👋 Te comparto opciones disponibles:");
  const [msgOutro, setMsgOutro] = useState("¿Te aparto alguna opción?");
  const [msgNote, setMsgNote] = useState("");

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
    setLines((p) => [...p, { vehicleIndex: idx, size: "", qty: 1 }]);
  }

  function removeVehicle(vIdx: number) {
    if (vehicles.length === 1) return;
    setVehicles((prev) => prev.filter((_, i) => i !== vIdx));
    setLines((prev) =>
      prev
        .filter((l) => l.vehicleIndex !== vIdx)
        .map((l) => ({ ...l, vehicleIndex: l.vehicleIndex > vIdx ? l.vehicleIndex - 1 : l.vehicleIndex }))
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

  function canStep1() {
    return customerName.trim().length >= 2 && customerEmail.trim().includes("@") && customerPhone.trim().length >= 7;
  }
  function canStep2() {
    return vehicles.every((v) => v.make && v.model && v.year);
  }
  function canStep4() {
    return lines.some((l) => l.size.trim() && (Number(l.qty) || 0) >= 1);
  }

  async function buildDraftAndShowOptions() {
    setStatus("Buscando llantas disponibles...");
    setDraft(null);

    if (!canStep1()) return setStatus("Completa cliente (nombre, teléfono, email).");
    if (!canStep2()) return setStatus("Completa vehículo(s): marca, modelo y año.");
    if (!canStep4()) return setStatus("Pon al menos una medida y cantidad.");

    const cleanLines = lines
      .map((l) => ({ ...l, size: l.size.trim(), qty: Number(l.qty) || 0 }))
      .filter((l) => l.size && l.qty >= 1);

    const payloadLines = cleanLines.map((l) => {
      const v = vehicles[l.vehicleIndex];
      return { size: l.size, qty: l.qty, vehicleMake: v.make, vehicleModel: v.model, vehicleYear: Number(v.year) };
    });

    const res = await 
    const linesWithVehicle = (lines ?? []).map((l: any) => {
      const v = (vehicles ?? [])[Number(l.vehicleIndex)] ?? {};
      return {
        ...l,
        vehicleMake: v.make ?? null,
        vehicleModel: v.model ?? null,
        vehicleYear: v.year ?? null
      };
    });
fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: payloadLines,
        markup, install, extras, minStock,
        customerName, customerEmail, customerPhone,
        depositAmount: depositAmount === "" ? null : Number(depositAmount),
        promisedAt: promisedAt || null,
        internalNotes: internalNotes || null,
      }),
    });

    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));

    d.quoteNumber = d.quoteNumber ?? "BORRADOR (sin folio)";
    setDraft(d);
    setStatus("✅ Listo. Selecciona qué opciones vas a enviar al cliente (o envía todas).");
  }

  async function setIncluded(quoteItemId: string, included: boolean) {
    setDraft((prev: any) => {
      if (!prev) return prev;
      const lines = (prev.lines ?? []).map((ln: any) => ({
        ...ln,
        options: (ln.options ?? []).map((o: any) => (o.quoteItemId === quoteItemId ? { ...o, included } : o)),
      }));
      return { ...prev, lines };
    });

    const res = await fetch("/api/quote/include", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteItemId, included }),
    });
    const d = await res.json();
    if (!res.ok) setStatus("Error guardando selección: " + (d.error ?? "unknown"));
  }

  function toggleAllInLine(lineId: string, includeAll: boolean) {
    const ln = (draft?.lines ?? []).find((x: any) => x.lineId === lineId);
    if (!ln) return;
    for (const o of ln.options ?? []) setIncluded(o.quoteItemId, includeAll);
  }

  function lineHasAtLeastOneIncluded(line: any) {
    const opts = line.options ?? [];
    return opts.some((o: any) => o.included !== false);
  }

  function canProceedToStep5() {
    if (!draft?.lines?.length) return false;
    return draft.lines.every((ln: any) => (ln.options?.length ? lineHasAtLeastOneIncluded(ln) : true));
  }

  function buildPreviewText() {
    const qn = draft?.quoteNumber ?? "BORRADOR";
    const linesTxt: string[] = [];
    for (const ln of draft?.lines ?? []) {
      const make = (ln as any).vehicleMake ?? (ln as any).vehicle_make ?? '';
      const model = (ln as any).vehicleModel ?? (ln as any).vehicle_model ?? '';
      const year = (ln as any).vehicleYear ?? (ln as any).vehicle_year ?? '';
      const vehicle = [make, model, year].filter(Boolean).join(" ");
      if (vehicle) {
        linesTxt.push(`• Vehículo: ${vehicle} — Medida: ${ln.size} (x${ln.requestedQty})`);
      } else {
        linesTxt.push(`• Medida: ${ln.size} (x${ln.requestedQty})`);
      }
      const opts = (ln.options ?? []).filter((o: any) => o.included !== false);
      for (const o of opts) {
        linesTxt.push(`  - ${o.tierLabel}: ${o.brand} ${o.model} ${o.loadSpeed ?? ""} | ${fmtMoney(o.priceEach)} c/u | Total: ${fmtMoney(o.totalTires)}`);
      }
      linesTxt.push("");
    }

    const header = [
      "Llantitune Cotización",
      `No. ${qn}`,
      `Cliente: ${customerName}`,
      `Tel: ${customerPhone}`,
      `Email: ${customerEmail}`,
      "",
      msgIntro,
      msgNote ? `Nota: ${msgNote}` : "",
      "",
    ].filter(Boolean);

    const footer = ["", msgOutro].filter(Boolean);

    return [...header, ...linesTxt, ...footer].join("\n");
  }

  async function downloadPDF() {
    if (!draft?.quoteId) return;
    const res = await fetch("/api/pdf?quoteId=" + encodeURIComponent(draft.quoteId));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ((draft?.quoteNumber ?? "BORRADOR") + ".pdf").replaceAll("/", "-");
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendAndAssignFolio() {
    if (!draft?.quoteId) return;
    if (!canProceedToStep5()) return setStatus("Selecciona al menos 1 opción por cada medida.");
    setStatus("Enviando y asignando folio...");
    const res = await fetch("/api/admin/quote/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: draft.quoteId, status: "SENT" }),
    });
    const d = await res.json();
    if (!res.ok) return setStatus("Error: " + (d.error ?? "unknown"));
    setStatus("✅ ENVIADA. Ya puedes mandarla por WhatsApp o correo.");
    if (d.quoteNumber) setDraft((p: any) => ({ ...p, quoteNumber: d.quoteNumber }));
    // also mark as sent in local state
    setDraft((p: any) => ({ ...p, status: 'SENT' }));
  }

  function openWhatsapp() {
    const txt = buildPreviewText();
    const url = "https://wa.me/?text=" + encodeURIComponent(txt);
    window.open(url, "_blank");
  }

  function prepareEmail() {
    const subject = `Llantitune Cotización ${draft?.quoteNumber ?? "BORRADOR"}`;
    const body = buildPreviewText();
    const mailto = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  const isSent = !(String(draft?.quoteNumber ?? '').includes('BORRADOR'));

  const stepTitle = {
    1: "1) Datos del cliente (obligatorio)",
    2: "2) Vehículo(s) (obligatorio)",
    3: "3) Anticipo / fecha promesa / notas (interno)",
    4: "4) Medidas + seleccionar opciones a enviar",
    5: "5) Personalizar mensaje + previsualizar + enviar",
  }[step];

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Cotizador Llantitune</h2>
      <div style={{ color: "#666", marginTop: -8 }}>Flujo guiado: cliente → vehículo(s) → internos → medidas → seleccionar → previsualizar y enviar</div>

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
              disabled={!canStep1()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: canStep1() ? "#111" : "#ddd",
                color: canStep1() ? "white" : "#666",
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
              disabled={!canStep2()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: canStep2() ? "#111" : "#ddd",
                color: canStep2() ? "white" : "#666",
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
              Ajustes internos (markup/servicios/stock mínimo)
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
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={l.qty}
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
              onClick={buildDraftAndShowOptions}
              disabled={!canStep4()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: canStep4() ? "#111" : "#ddd",
                color: canStep4() ? "white" : "#666",
              }}
            >
              Ver llantas disponibles →
            </button>
          </div>

          {draft ? (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Llantas disponibles (elige cuáles vas a enviar)</div>
              <div style={{ color: "#666", marginBottom: 10 }}>
                Cliente: <b>{customerName}</b> — {customerPhone} — {customerEmail}
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {(draft.lines ?? []).map((ln: any) => (
                  <div key={ln.lineId} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div><b>Medida:</b> {ln.size} &nbsp; <b>Solicitado:</b> {ln.requestedQty}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                          <b>Vehículo:</b> {vehicleLabelFromLine(ln) || "—"}
                        </div>
                        {ln.notice ? <div style={{ color: "#b45309", marginTop: 6 }}><b>Nota:</b> {ln.notice}</div> : null}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button type="button" onClick={() => toggleAllInLine(ln.lineId, true)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>Enviar todas</button>
                        <button type="button" onClick={() => toggleAllInLine(ln.lineId, false)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>Quitar todas</button>
                      </div>
                    </div>

                    {ln.options?.length ? (
                      <div style={{ marginTop: 10, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Enviar</th>
                              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Gama</th>
                              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Marca</th>
                              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Modelo</th>
                              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Load</th>
                              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Stock</th>
                              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Cotizable</th>
                              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Precio c/u</th>
                              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ln.options.map((o: any) => (
                              <tr key={o.quoteItemId} style={{ opacity: o.included === false ? 0.45 : 1 }}>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                                  <input
                                    type="checkbox"
                                    checked={o.included !== false}
                                    onChange={(e) => setIncluded(o.quoteItemId, e.target.checked)}
                                  />
                                </td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}><b>{o.tierLabel}</b></td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.brand}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.model}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{o.loadSpeed ?? ""}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{o.stock}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{o.quotedQty}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{fmtMoney(o.priceEach)}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{fmtMoney(o.totalTires)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ color: "#666", marginTop: 10 }}>Sin opciones con stock mínimo.</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={!canProceedToStep5()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: canProceedToStep5() ? "#111" : "#ddd",
                    color: canProceedToStep5() ? "white" : "#666",
                  }}
                >
                  Continuar a mensaje y envío →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* STEP 5 */}
      {step === 5 ? (
        <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          {!draft ? (
            <div style={{ color: "#666" }}>Primero ve opciones en el Paso 4.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18 }}><b>{draft.quoteNumber ?? "BORRADOR (sin folio)"}</b></div>
                  <div style={{ color: "#666" }}>
                    Cliente: <b>{customerName}</b> — {customerPhone} — {customerEmail}
                  </div>
                </div>

              {!isSent ? (
                <div style={{ marginTop: 10, color: "#b45309" }}>
                  <b>Nota:</b> Aún es borrador. Pulsa <b>Enviar (genera folio)</b> para asignar el número de cotización y habilitar WhatsApp/Correo.
                </div>
              ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={downloadPDF}>Descargar PDF</button>
                  <button
                    type="button"
                    onClick={sendAndAssignFolio}
                    style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "white" }}
                  >
                    Enviar (genera folio)
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Texto inicial</span>
                  <input value={msgIntro} onChange={(e) => setMsgIntro(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Texto final</span>
                  <input value={msgOutro} onChange={(e) => setMsgOutro(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / span 2" }}>
                  <span style={{ fontWeight: 600 }}>Nota adicional (opcional)</span>
                  <input value={msgNote} onChange={(e) => setMsgNote(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => navigator.clipboard.writeText(buildPreviewText())} disabled={!isSent} title={!isSent ? 'Primero pulsa Enviar para asignar folio' : ''}>Copiar texto</button>
                <button type="button" onClick={openWhatsapp} disabled={!isSent} title={!isSent ? 'Primero pulsa Enviar para asignar folio' : ''}>Abrir WhatsApp</button>
                <button type="button" onClick={prepareEmail} disabled={!isSent} title={!isSent ? 'Primero pulsa Enviar para asignar folio' : ''}>Preparar correo</button>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Previsualización (antes de enviar)</div>
                <textarea
                  value={buildPreviewText()}
                  readOnly
                  style={{ width: "100%", minHeight: 360, padding: 12, borderRadius: 12, border: "1px solid #ddd", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
