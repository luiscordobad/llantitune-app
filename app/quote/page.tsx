"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Helpers
========================= */
function vehicleLabelFromLine(ln: any) {
  const make = ln.vehicleMake ?? ln.vehicle_make ?? "";
  const model = ln.vehicleModel ?? ln.vehicle_model ?? "";
  const year = ln.vehicleYear ?? ln.vehicle_year ?? "";
  return [make, model, year].filter(Boolean).join(" ");
}

function fmtMoney(n: number) {
  return "$" + (Number.isFinite(n) ? n.toFixed(2) : "0.00");
}

function makeOptionKey(lineId: string, o: any) {
  return (
    o.quoteItemId ??
    o.quote_item_id ??
    `${lineId}::${o.provider ?? ""}::${o.sku ?? ""}::${o.rank ?? ""}`
  );
}

/* =========================
   Types
========================= */
type Vehicle = { make: string; model: string; year: string };
type Line = { vehicleIndex: number; size: string; qty: number };

/* =========================
   Combobox
========================= */
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
    if (!query) return options.slice(0, 80);
    return options.filter((x) => x.toLowerCase().includes(query)).slice(0, 80);
  }, [options, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <input
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
      {open && !disabled && (
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
                }}
              >
                {opt}
              </button>
            ))
          ) : (
            <div style={{ padding: 12, color: "#666" }}>Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   Page
========================= */
export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [status, setStatus] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { make: "", model: "", year: "" },
  ]);
  const [lines, setLines] = useState<Line[]>([
    { vehicleIndex: 0, size: "", qty: 4 },
  ]);

  const [draft, setDraft] = useState<any>(null);

  /* =========================
     API — selección FINAL
  ========================= */
  async function selectQuoteItem(lineId: string, quoteItemId: string) {
    const res = await fetch("/api/quotes/select-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_id: lineId, quote_item_id: quoteItemId }),
    });

    if (!res.ok) {
      const d = await res.json();
      setStatus("Error guardando selección: " + (d.error ?? "unknown"));
      return;
    }

    setDraft((prev: any) => ({
      ...prev,
      lines: prev.lines.map((ln: any) =>
        String(ln.lineId) !== String(lineId)
          ? ln
          : {
              ...ln,
              selectedQuoteItemId: quoteItemId,
              options: ln.options.map((o: any) => ({
                ...o,
                isSelected: o.quoteItemId === quoteItemId,
              })),
            }
      ),
    }));
  }

  /* =========================
     BUILD DRAFT
  ========================= */
  async function buildDraft() {
    setStatus("Buscando llantas...");
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        vehicles,
        lines,
      }),
    });

    const d = await res.json();
    if (!res.ok) {
      setStatus("Error: " + d.error);
      return;
    }

    d.lines = d.lines.map((ln: any) => ({
      ...ln,
      options: ln.options.map((o: any) => ({
        ...o,
        optionKey: makeOptionKey(ln.lineId, o),
        isSelected: ln.selectedQuoteItemId === o.quoteItemId,
      })),
    }));

    setDraft(d);
    setStatus("Selecciona la opción FINAL por medida");
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h1>Cotizar</h1>
      <div style={{ marginBottom: 12 }}>{status}</div>

      {step === 4 && (
        <>
          <button onClick={buildDraft}>Ver llantas disponibles</button>

          {draft?.lines?.map((ln: any) => (
            <div
              key={ln.lineId}
              style={{
                marginTop: 20,
                border: "1px solid #eee",
                padding: 12,
                borderRadius: 12,
              }}
            >
              <b>
                Medida {ln.size} — {vehicleLabelFromLine(ln)}
              </b>

              <table style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Elegir</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {ln.options.map((o: any) => (
                    <tr
                      key={o.optionKey}
                      style={{
                        background: o.isSelected ? "#eef2ff" : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="radio"
                          name={`line-${ln.lineId}`}
                          checked={o.isSelected === true}
                          onChange={() =>
                            selectQuoteItem(ln.lineId, o.quoteItemId)
                          }
                        />
                      </td>
                      <td>{o.brand}</td>
                      <td>{o.model}</td>
                      <td>{fmtMoney(o.priceEach)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
