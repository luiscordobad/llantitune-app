"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===================== HELPERS ===================== */

function vehicleLabelFromLine(ln: any) {
  const make = ln.vehicleMake ?? ln.vehicle_make ?? "";
  const model = ln.vehicleModel ?? ln.vehicle_model ?? "";
  const year = ln.vehicleYear ?? ln.vehicle_year ?? "";
  return [make, model, year].filter(Boolean).join(" ");
}

function fmtMoney(n: number) {
  return "$" + (Number.isFinite(n) ? n.toFixed(2) : "0.00");
}

/**
 * Stable key for options even if quoteItemId is null
 */
function makeOptionKey(lineId: string, o: any) {
  const provider = String(o?.provider ?? "");
  const sku = String(o?.sku ?? "");
  const rank = String(o?.rank ?? "");
  const tireId = String(o?.tireId ?? o?.tire_id ?? "");
  return String(
    o?.quoteItemId ??
      o?.quote_item_id ??
      `${lineId}::${provider}::${sku || tireId}::${rank}`
  );
}

/* ===================== TYPES ===================== */

type Vehicle = { make: string; model: string; year: string };
type Line = { vehicleIndex: number; size: string; qty: number };

/* ===================== COMPONENTS ===================== */

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

/* ===================== PAGE ===================== */

export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [status, setStatus] = useState("");

  /* ---------- customer ---------- */
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  /* ---------- vehicles ---------- */
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { make: "", model: "", year: "" },
  ]);
  const [makes, setMakes] = useState<string[]>([]);
  const [modelsByVehicle, setModelsByVehicle] = useState<Record<number, string[]>>(
    {}
  );
  const [yearsByVehicle, setYearsByVehicle] = useState<Record<number, number[]>>(
    {}
  );

  /* ---------- internals ---------- */
  const [markup, setMarkup] = useState(30);
  const [install, setInstall] = useState(1000);
  const [extras, setExtras] = useState(1000);
  const [minStock, setMinStock] = useState(8);

  /* ---------- lines ---------- */
  const [lines, setLines] = useState<Line[]>([
    { vehicleIndex: 0, size: "", qty: 4 },
  ]);

  /* ---------- draft ---------- */
  const [draft, setDraft] = useState<any>(null);

  /* ===================== LOAD MAKES ===================== */
  useEffect(() => {
    fetch("/api/vehicle/makes")
      .then((r) => r.json())
      .then((d) => setMakes(d.makes ?? []));
  }, []);

  /* ===================== BUILD DRAFT ===================== */
  async function buildDraftAndShowOptions() {
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
        markup,
        install,
        extras,
        minStock,
      }),
    });

    const d = await res.json();
    if (!res.ok) {
      setStatus(d.error || "Error");
      return;
    }

    d.quoteNumber = d.quoteNumber ?? "BORRADOR";
    d.lines = (d.lines ?? []).map((ln: any) => ({
      ...ln,
      lineId: ln.lineId ?? ln.line_id,
      options: (ln.options ?? []).map((o: any) => ({
        ...o,
        optionKey: makeOptionKey(ln.lineId ?? ln.line_id, o),
      })),
    }));

    setDraft(d);
    setStatus("Selecciona opciones");
  }

  /* ===================== CORE FIX ===================== */

  async function persistSelectedItem(lineId: string, quoteItemId: string) {
    await fetch("/api/quotes/select-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_id: lineId,
        quote_item_id: quoteItemId,
      }),
    });
  }

  async function setIncluded(
    optionKey: string,
    included: boolean,
    quoteItemId?: string
  ) {
    setDraft((prev: any) => {
      if (!prev) return prev;

      const lines = prev.lines.map((ln: any) => {
        let selected = ln.selectedQuoteItemId;

        const options = ln.options.map((o: any) => {
          if (o.optionKey === optionKey) {
            if (included && !selected && quoteItemId) {
              selected = quoteItemId;
              persistSelectedItem(ln.lineId, quoteItemId);
            }
            return { ...o, included };
          }
          return o;
        });

        return { ...ln, options, selectedQuoteItemId: selected };
      });

      return { ...prev, lines };
    });

    if (!quoteItemId) return;

    await fetch("/api/quote/include", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteItemId, included }),
    });
  }

  /* ===================== UI ===================== */

  return (
    <div style={{ padding: 24 }}>
      <h1>Cotizar</h1>

      <button onClick={buildDraftAndShowOptions}>
        Ver llantas disponibles
      </button>

      {draft?.lines?.map((ln: any) => (
        <div key={ln.lineId} style={{ marginTop: 20 }}>
          <h3>
            {ln.size} — {vehicleLabelFromLine(ln)}
          </h3>

          <table>
            <tbody>
              {ln.options.map((o: any) => (
                <tr key={o.optionKey}>
                  <td>
                    <input
                      type="checkbox"
                      checked={o.included !== false}
                      onChange={(e) =>
                        setIncluded(
                          o.optionKey,
                          e.target.checked,
                          o.quoteItemId
                        )
                      }
                    />
                  </td>
                  <td>{o.brand}</td>
                  <td>{o.model}</td>
                  <td>{fmtMoney(o.totalTires)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ marginTop: 20, color: "#666" }}>{status}</div>
    </div>
  );
}
