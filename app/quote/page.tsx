"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function vehicleLabelFromLine(ln: any) {
  const make = (ln as any).vehicleMake ?? (ln as any).vehicle_make ?? "";
  const model = (ln as any).vehicleModel ?? (ln as any).vehicle_model ?? "";
  const year = (ln as any).vehicleYear ?? (ln as any).vehicle_year ?? "";
  return [make, model, year].filter(Boolean).join(" ");
}

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

  const stepTitle = {
    1: "1) Datos del cliente (obligatorio)",
    2: "2) Vehículo(s) (obligatorio)",
    3: "3) Internos (anticipo/fecha/servicios)",
    4: "4) Medidas + seleccionar opciones a enviar",
    5: "5) Mensaje + previsualizar + enviar",
  }[step];

  const stepHint = {
    1: "Captura los datos del cliente. Son obligatorios para generar la cotización.",
    2: "Selecciona marca, modelo y año por vehículo. Puedes agregar más de un vehículo.",
    3: "Ajustes internos. Instalación y extras se cobran por coche (no por llanta).",
    4: "Agrega medidas y cantidades por vehículo, luego elige qué opciones vas a enviar.",
    5: "Personaliza el mensaje, genera folio y envía por WhatsApp o correo.",
  }[step];

  return (
    <div className="lt-page">
      <div className="lt-container">
        <header className="lt-header">
          <div className="lt-brand">
            <div className="lt-title">Cotizador <span>Llantitune</span></div>
            <div className="lt-subtitle">Flujo guiado: cliente → vehículo(s) → internos → medidas → seleccionar → previsualizar y enviar</div>
          </div>

          <div className="lt-headerRight">
            <div className={"lt-chip " + (draft?.status === "SENT" || isSent ? "lt-chip--sent" : "lt-chip--draft")}>
              {draft?.status === "SENT" || isSent ? "ENVIADA" : "BORRADOR"}
            </div>
          </div>
        </header>

        <nav className="lt-stepper" aria-label="Pasos">
          {[1, 2, 3, 4, 5].map((s) => {
            const active = step === s;
            const done = step > s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s as any)}
                className={
                  "lt-step " +
                  (active ? "lt-step--active " : "") +
                  (done ? "lt-step--done " : "")
                }
              >
                <span className="lt-stepNum">{s}</span>
                <span className="lt-stepLabel">Paso {s}</span>
              </button>
            );
          })}
        </nav>

        <section className="lt-card lt-card--title">
          <div className="lt-cardTitle">{stepTitle}</div>
          <div className="lt-cardHint">{stepHint}</div>
        </section>

        {status ? (
          <div className={"lt-alert " + (String(status).startsWith("✅") ? "lt-alert--ok" : String(status).startsWith("Error") ? "lt-alert--err" : "lt-alert--info")}>
            {status}
          </div>
        ) : null}

        {vehicleLoading ? (
          <div className="lt-alert lt-alert--info">
            {vehicleLoading}
          </div>
        ) : null}

        {/* STEP 1 */}
        {step === 1 ? (
          <section className="lt-card">
            <div className="lt-grid lt-grid--2">
              <div className="lt-field">
                <label className="lt-label">Nombre <span className="lt-req">*</span></label>
                <input className="lt-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. Luis" />
              </div>

              <div className="lt-field">
                <label className="lt-label">Teléfono <span className="lt-req">*</span></label>
                <input className="lt-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Ej. 442..." />
              </div>

              <div className="lt-field lt-span2">
                <label className="lt-label">Email <span className="lt-req">*</span></label>
                <input className="lt-input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="ejemplo@correo.com" />
              </div>
            </div>

            <div className="lt-actions">
              <div />
              <button type="button" onClick={() => setStep(2)} disabled={!canStep1()} className="lt-btn lt-btn--primary">
                Siguiente <span aria-hidden>→</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <section className="lt-card">
            <div className="lt-cardTop">
              <div>
                <div className="lt-h3">Vehículos</div>
                <div className="lt-muted">Agrega uno o más vehículos. Cada medida se liga a un vehículo.</div>
              </div>
              <button type="button" onClick={addVehicle} className="lt-btn lt-btn--secondary">
                + Agregar vehículo
              </button>
            </div>

            <div className="lt-stack">
              {vehicles.map((v, idx) => (
                <div key={idx} className="lt-panel">
                  <div className="lt-panelTop">
                    <div className="lt-panelTitle">Vehículo #{idx + 1}</div>
                    {vehicles.length > 1 ? (
                      <button type="button" onClick={() => removeVehicle(idx)} className="lt-btn lt-btn--ghost">
                        Quitar
                      </button>
                    ) : null}
                  </div>

                  <div className="lt-grid lt-grid--3">
                    <div className="lt-field">
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
                    </div>

                    <div className="lt-field">
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
                    </div>

                    <div className="lt-field">
                      <label className="lt-label">Año <span className="lt-req">*</span></label>
                      <select
                        className="lt-input"
                        value={v.year}
                        disabled={!v.model}
                        onChange={(e) => setVehicle(idx, { year: e.target.value })}
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

            <div className="lt-actions">
              <button type="button" onClick={() => setStep(1)} className="lt-btn lt-btn--secondary">
                <span aria-hidden>←</span> Atrás
              </button>
              <button type="button" onClick={() => setStep(3)} disabled={!canStep2()} className="lt-btn lt-btn--primary">
                Siguiente <span aria-hidden>→</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <section className="lt-card">
            <div className="lt-grid lt-grid--2">
              <div className="lt-field">
                <label className="lt-label">Anticipo (MXN) <span className="lt-tag">interno</span></label>
                <input
                  className="lt-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ej. 0"
                />
              </div>

              <div className="lt-field">
                <label className="lt-label">Fecha promesa <span className="lt-tag">interno</span></label>
                <input className="lt-input" type="date" value={promisedAt} onChange={(e) => setPromisedAt(e.target.value)} />
              </div>

              <div className="lt-field lt-span2">
                <label className="lt-label">Notas internas <span className="lt-tag">interno</span></label>
                <textarea className="lt-input lt-textarea" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Notas para operación interna..." />
              </div>
            </div>

            <details className="lt-details">
              <summary className="lt-summary">
                Ajustes internos (markup / servicios / stock mínimo)
              </summary>

              <div className="lt-grid lt-grid--4">
                <div className="lt-field">
                  <label className="lt-label">Markup %</label>
                  <input className="lt-input" type="text" inputMode="numeric" pattern="[0-9]*" value={markup}
                    onChange={(e) => setMarkup(Number(e.target.value) || 0)} />
                </div>

                <div className="lt-field">
                  <label className="lt-label">Servicio de alineación y balanceo <span className="lt-tag">por coche</span></label>
                  <input className="lt-input" type="text" inputMode="numeric" pattern="[0-9]*" value={install}
                    onChange={(e) => setInstall(Number(e.target.value) || 0)} />
                </div>

                <div className="lt-field">
                  <label className="lt-label">Extras <span className="lt-tag">por coche</span></label>
                  <input className="lt-input" type="text" inputMode="numeric" pattern="[0-9]*" value={extras}
                    onChange={(e) => setExtras(Number(e.target.value) || 0)} />
                </div>

                <div className="lt-field">
                  <label className="lt-label">Stock mínimo</label>
                  <input className="lt-input" type="text" inputMode="numeric" pattern="[0-9]*" value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="lt-muted" style={{ marginTop: 10 }}>
                Los servicios se calculan como <b>(alineación y balanceo + extras) × número de vehículos</b>.
              </div>
            </details>

            <div className="lt-actions">
              <button type="button" onClick={() => setStep(2)} className="lt-btn lt-btn--secondary">
                <span aria-hidden>←</span> Atrás
              </button>
              <button type="button" onClick={() => setStep(4)} className="lt-btn lt-btn--primary">
                Siguiente <span aria-hidden>→</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* STEP 4 */}
        {step === 4 ? (
          <section className="lt-card">
            <div className="lt-cardTop">
              <div>
                <div className="lt-h3">Medidas y cantidades</div>
                <div className="lt-muted">Define medidas por vehículo y cuántas llantas necesita. Luego verás opciones disponibles.</div>
              </div>
              <button type="button" onClick={addLine} className="lt-btn lt-btn--secondary">
                + Agregar medida
              </button>
            </div>

            <div className="lt-stack">
              {lines.map((l, idx) => (
                <div key={idx} className="lt-row">
                  <div className="lt-field">
                    <label className="lt-label">Vehículo</label>
                    <select className="lt-input" value={String(l.vehicleIndex)} onChange={(e) => updateLine(idx, { vehicleIndex: Number(e.target.value) })}>
                      {vehicles.map((v, i) => (
                        <option key={i} value={String(i)}>
                          #{i + 1} {v.make} {v.model} {v.year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lt-field">
                    <label className="lt-label">Medida</label>
                    <input className="lt-input" value={l.size} onChange={(e) => updateLine(idx, { size: e.target.value })} placeholder="Ej. 215/55R16" />
                  </div>

                  <div className="lt-field">
                    <label className="lt-label">Cantidad</label>
                    <input className="lt-input" type="text" inputMode="numeric" pattern="[0-9]*" value={l.qty}
                      onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })} />
                    <div className="lt-help">Mínimo 1</div>
                  </div>

                  <div className="lt-field lt-field--actions">
                    {lines.length > 1 ? (
                      <button type="button" onClick={() => removeLine(idx)} className="lt-btn lt-btn--ghost">
                        Quitar
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lt-actions">
              <button type="button" onClick={() => setStep(3)} className="lt-btn lt-btn--secondary">
                <span aria-hidden>←</span> Atrás
              </button>
              <button type="button" onClick={buildDraftAndShowOptions} disabled={!canStep4()} className="lt-btn lt-btn--primary">
                Ver llantas disponibles <span aria-hidden>→</span>
              </button>
            </div>

            {draft ? (
              <div className="lt-dividerTop">
                <div className="lt-sectionTitle">Llantas disponibles</div>
                <div className="lt-muted" style={{ marginTop: 4 }}>
                  Cliente: <b>{customerName}</b> · {customerPhone} · {customerEmail}
                </div>

                <div className="lt-stack" style={{ marginTop: 12 }}>
                  {(draft.lines ?? []).map((ln: any) => (
                    <div key={ln.lineId} className="lt-panel">
                      <div className="lt-panelTop">
                        <div>
                          <div className="lt-panelTitle">
                            {ln.size} <span className="lt-muted">· solicitado x{ln.requestedQty}</span>
                          </div>
                          <div className="lt-muted" style={{ marginTop: 4 }}>
                            Vehículo: <b>{vehicleLabelFromLine(ln) || "—"}</b>
                          </div>
                          {ln.notice ? (
                            <div className="lt-note">
                              <b>Nota:</b> {ln.notice}
                            </div>
                          ) : null}
                        </div>

                        <div className="lt-inline">
                          <button type="button" onClick={() => toggleAllInLine(ln.lineId, true)} className="lt-btn lt-btn--secondary">
                            Enviar todas
                          </button>
                          <button type="button" onClick={() => toggleAllInLine(ln.lineId, false)} className="lt-btn lt-btn--secondary">
                            Quitar todas
                          </button>
                        </div>
                      </div>

                      {ln.options?.length ? (
                        <div className="lt-tableWrap">
                          <table className="lt-table">
                            <thead>
                              <tr>
                                <th>Enviar</th>
                                <th>Gama</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th>Load</th>
                                <th className="rt">Stock</th>
                                <th className="rt">Cotizable</th>
                                <th className="rt">Precio c/u</th>
                                <th className="rt">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ln.options.map((o: any) => (
                                <tr key={o.optionKey ?? o.quoteItemId} className={o.included === false ? "is-off" : ""}>
                                  <td>
                                    <input type="checkbox" checked={o.included !== false} onChange={(e) => setIncluded(o.optionKey ?? o.quoteItemId, e.target.checked)} />
                                  </td>
                                  <td><span className="lt-badge">{o.tierLabel || "—"}</span></td>
                                  <td>{o.brand}</td>
                                  <td>{o.model}</td>
                                  <td>{o.loadSpeed ?? ""}</td>
                                  <td className="rt">{o.stock}</td>
                                  <td className="rt">{o.quotedQty}</td>
                                  <td className="rt">{fmtMoney(o.priceEach)}</td>
                                  <td className="rt">{fmtMoney(o.totalTires)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="lt-muted" style={{ marginTop: 10 }}>Sin opciones con stock mínimo.</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="lt-actions" style={{ justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setStep(5)} disabled={!canProceedToStep5()} className="lt-btn lt-btn--primary">
                    Continuar a mensaje y envío <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* STEP 5 */}
        {step === 5 ? (
          <section className="lt-card">
            {!draft ? (
              <div className="lt-muted">Primero ve opciones en el Paso 4.</div>
            ) : (
              <>
                <div className="lt-cardTop">
                  <div>
                    <div className="lt-h3">{draft.quoteNumber ?? "BORRADOR (sin folio)"}</div>
                    <div className="lt-muted">
                      Cliente: <b>{customerName}</b> · {customerPhone} · {customerEmail}
                    </div>

                    {!isSent ? (
                      <div className="lt-note" style={{ marginTop: 10 }}>
                        <b>Nota:</b> Aún es borrador. Pulsa <b>Enviar (genera folio)</b> para asignar el número de cotización y habilitar WhatsApp/Correo.
                      </div>
                    ) : null}
                  </div>

                  <div className="lt-inline">
                    <button type="button" onClick={downloadPDF} className="lt-btn lt-btn--secondary">Descargar PDF</button>
                    <button type="button" onClick={sendAndAssignFolio} className="lt-btn lt-btn--primary">Enviar (genera folio)</button>
                  </div>
                </div>

                <div className="lt-grid lt-grid--2" style={{ marginTop: 14 }}>
                  <div className="lt-field">
                    <label className="lt-label">Texto inicial</label>
                    <input className="lt-input" value={msgIntro} onChange={(e) => setMsgIntro(e.target.value)} />
                  </div>
                  <div className="lt-field">
                    <label className="lt-label">Texto final</label>
                    <input className="lt-input" value={msgOutro} onChange={(e) => setMsgOutro(e.target.value)} />
                  </div>
                  <div className="lt-field lt-span2">
                    <label className="lt-label">Nota adicional (opcional)</label>
                    <input className="lt-input" value={msgNote} onChange={(e) => setMsgNote(e.target.value)} />
                  </div>
                </div>

                <div className="lt-inline" style={{ marginTop: 12, flexWrap: "wrap" }}>
                  <button type="button" className="lt-btn lt-btn--secondary" onClick={() => navigator.clipboard.writeText(buildPreviewText())} disabled={!isSent} title={!isSent ? "Primero pulsa Enviar para asignar folio" : ""}>
                    Copiar texto
                  </button>
                  <button type="button" className="lt-btn lt-btn--secondary" onClick={openWhatsapp} disabled={!isSent} title={!isSent ? "Primero pulsa Enviar para asignar folio" : ""}>
                    Abrir WhatsApp
                  </button>
                  <button type="button" className="lt-btn lt-btn--secondary" onClick={prepareEmail} disabled={!isSent} title={!isSent ? "Primero pulsa Enviar para asignar folio" : ""}>
                    Preparar correo
                  </button>
                </div>

                <div className="lt-dividerTop">
                  <div className="lt-sectionTitle">Previsualización</div>
                  <textarea className="lt-preview" value={buildPreviewText()} readOnly />
                </div>
              </>
            )}
          </section>
        ) : null}

        <style jsx>{`
          :global(body){
            background: radial-gradient(900px 500px at 20% -10%, rgba(0,0,0,0.06), transparent 60%),
                        radial-gradient(900px 500px at 80% -10%, rgba(0,0,0,0.05), transparent 60%),
                        #f6f7f9;
            color: #0f172a;
          }
          .lt-page{ padding: 22px 10px 34px; }
          .lt-container{ max-width: 1100px; margin: 0 auto; }

          .lt-header{
            display:flex; align-items:flex-start; justify-content:space-between; gap:14px;
            padding: 18px 18px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 18px;
            background: rgba(255,255,255,0.75);
            backdrop-filter: blur(8px);
            box-shadow: 0 18px 38px rgba(2, 8, 23, 0.06);
          }
          .lt-title{ font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
          .lt-title span{ color:#111; }
          .lt-subtitle{ margin-top: 4px; color:#64748b; font-size: 13px; }
          .lt-headerRight{ display:flex; align-items:center; gap:10px; }

          .lt-chip{
            font-weight: 800; letter-spacing: 0.08em; font-size: 11px;
            padding: 8px 10px; border-radius: 999px;
            border: 1px solid rgba(15,23,42,0.12);
          }
          .lt-chip--draft{ background: #fff7ed; color:#9a3412; border-color: rgba(154,52,18,0.25); }
          .lt-chip--sent{ background: #ecfdf5; color:#065f46; border-color: rgba(6,95,70,0.25); }

          .lt-stepper{ display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
          .lt-step{
            display:flex; align-items:center; gap:10px;
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(15,23,42,0.12);
            background: rgba(255,255,255,0.8);
            cursor:pointer;
            transition: transform .06s ease, box-shadow .2s ease, background .2s ease;
          }
          .lt-step:hover{ box-shadow: 0 10px 24px rgba(2, 8, 23, 0.08); transform: translateY(-1px); }
          .lt-stepNum{
            width: 26px; height: 26px; border-radius: 999px;
            display:flex; align-items:center; justify-content:center;
            font-weight: 800;
            background: rgba(15,23,42,0.06);
          }
          .lt-stepLabel{ font-weight: 700; font-size: 13px; }
          .lt-step--active{ background:#111; color:#fff; border-color:#111; }
          .lt-step--active .lt-stepNum{ background: rgba(255,255,255,0.18); }
          .lt-step--done{ background: rgba(255,255,255,0.9); }

          .lt-card{
            margin-top: 12px;
            padding: 16px;
            border-radius: 18px;
            background: rgba(255,255,255,0.82);
            border: 1px solid rgba(15,23,42,0.08);
            box-shadow: 0 16px 34px rgba(2, 8, 23, 0.06);
          }
          .lt-card--title{ padding: 14px 16px; }
          .lt-cardTitle{ font-weight: 900; }
          .lt-cardHint{ margin-top: 6px; color:#64748b; font-size: 13px; }

          .lt-alert{
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid rgba(15,23,42,0.1);
            background: rgba(255,255,255,0.8);
            color:#0f172a;
          }
          .lt-alert--ok{ background: rgba(236,253,245,0.9); border-color: rgba(6,95,70,0.22); color:#065f46; }
          .lt-alert--err{ background: rgba(254,242,242,0.9); border-color: rgba(185,28,28,0.22); color:#991b1b; }
          .lt-alert--info{ background: rgba(239,246,255,0.9); border-color: rgba(29,78,216,0.18); color:#1e40af; }

          .lt-grid{ display:grid; gap: 12px; }
          .lt-grid--2{ grid-template-columns: 1fr 1fr; }
          .lt-grid--3{ grid-template-columns: 1fr 1fr 0.7fr; }
          .lt-grid--4{ grid-template-columns: 1fr 1fr 1fr 1fr; }
          .lt-span2{ grid-column: 1 / span 2; }

          .lt-field{ display:grid; gap: 6px; }
          .lt-label{ font-weight: 800; font-size: 13px; color:#0f172a; }
          .lt-req{ color:#ef4444; }
          .lt-help{ color:#64748b; font-size: 12px; }
          .lt-tag{
            display:inline-block;
            margin-left: 6px;
            padding: 2px 8px;
            border-radius: 999px;
            border: 1px solid rgba(15,23,42,0.12);
            background: rgba(15,23,42,0.03);
            font-weight: 800;
            font-size: 11px;
            color:#475569;
          }

          .lt-input{
            width:100%;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid rgba(15,23,42,0.14);
            background: rgba(255,255,255,0.95);
            outline: none;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
          }
          .lt-input:focus{ border-color: rgba(15,23,42,0.5); box-shadow: 0 0 0 4px rgba(15,23,42,0.08); }
          .lt-textarea{ min-height: 110px; resize: vertical; }

          .lt-actions{
            display:flex; align-items:center; justify-content:space-between;
            gap: 12px; margin-top: 14px;
          }

          .lt-btn{
            padding: 10px 14px;
            border-radius: 14px;
            border: 1px solid rgba(15,23,42,0.14);
            background: rgba(255,255,255,0.9);
            font-weight: 800;
            cursor:pointer;
            transition: transform .06s ease, box-shadow .2s ease, background .2s ease;
          }
          .lt-btn:hover{ box-shadow: 0 12px 26px rgba(2, 8, 23, 0.08); transform: translateY(-1px); }
          .lt-btn:disabled{ opacity: .55; cursor:not-allowed; transform:none; box-shadow:none; }
          .lt-btn--primary{ background:#111; color:#fff; border-color:#111; }
          .lt-btn--secondary{ background: rgba(255,255,255,0.95); }
          .lt-btn--ghost{ background: transparent; border-color: rgba(15,23,42,0.10); }

          .lt-cardTop{
            display:flex; align-items:flex-start; justify-content:space-between;
            gap: 12px; flex-wrap: wrap;
          }
          .lt-h3{ font-size: 18px; font-weight: 900; }
          .lt-muted{ color:#64748b; font-size: 13px; }
          .lt-stack{ display:grid; gap: 12px; margin-top: 12px; }
          .lt-panel{
            border-radius: 18px;
            border: 1px solid rgba(15,23,42,0.08);
            background: rgba(255,255,255,0.9);
            padding: 14px;
          }
          .lt-panelTop{ display:flex; justify-content:space-between; gap: 10px; flex-wrap: wrap; align-items:flex-start; }
          .lt-panelTitle{ font-weight: 900; }
          .lt-inline{ display:flex; gap: 10px; align-items:center; }

          .lt-row{
            display:grid;
            grid-template-columns: 1fr 1.1fr 0.7fr auto;
            gap: 10px;
            align-items:end;
          }
          .lt-field--actions{ display:flex; justify-content:flex-end; align-items:end; }

          .lt-details{ margin-top: 14px; }
          .lt-summary{ cursor:pointer; font-weight: 900; color:#0f172a; }

          .lt-dividerTop{ margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(15,23,42,0.08); }
          .lt-sectionTitle{ font-weight: 900; }

          .lt-note{
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(255,247,237,0.9);
            border: 1px solid rgba(154,52,18,0.18);
            color:#9a3412;
          }

          .lt-tableWrap{
            margin-top: 12px;
            overflow:auto;
            border-radius: 16px;
            border: 1px solid rgba(15,23,42,0.08);
          }
          .lt-table{
            width:100%;
            border-collapse: collapse;
            min-width: 880px;
            background: rgba(255,255,255,0.98);
          }
          .lt-table thead th{
            position: sticky;
            top: 0;
            background: #f8fafc;
            border-bottom: 1px solid rgba(15,23,42,0.10);
            text-align:left;
            font-size: 12px;
            font-weight: 900;
            color:#0f172a;
            padding: 10px 10px;
            z-index: 1;
          }
          .lt-table td{
            border-bottom: 1px solid rgba(15,23,42,0.06);
            padding: 10px 10px;
            font-size: 13px;
          }
          .lt-table tbody tr:hover{ background: rgba(15,23,42,0.03); }
          .lt-table .rt{ text-align:right; }
          .lt-table tbody tr.is-off{ opacity: .45; }

          .lt-badge{
            display:inline-block;
            padding: 3px 9px;
            border-radius: 999px;
            font-weight: 900;
            font-size: 11px;
            border: 1px solid rgba(15,23,42,0.12);
            background: rgba(15,23,42,0.03);
          }

          .lt-preview{
            width:100%;
            min-height: 380px;
            margin-top: 10px;
            padding: 14px;
            border-radius: 16px;
            border: 1px solid rgba(15,23,42,0.14);
            background: #0b1220;
            color: #e5e7eb;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            line-height: 1.4;
          }

          @media (max-width: 900px){
            .lt-grid--2{ grid-template-columns: 1fr; }
            .lt-grid--3{ grid-template-columns: 1fr; }
            .lt-grid--4{ grid-template-columns: 1fr 1fr; }
            .lt-span2{ grid-column: auto; }
            .lt-row{ grid-template-columns: 1fr; }
          }
          @media (max-width: 520px){
            .lt-grid--4{ grid-template-columns: 1fr; }
            .lt-header{ padding: 14px; }
            .lt-title{ font-size: 22px; }
          }
        `}</style>
      </div>
    </div>
  );
}

