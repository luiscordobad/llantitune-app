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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ make: "", model: "", year: "" }]);
  const [lines, setLines] = useState<Line[]>([{ vehicleIndex: 0, size: "", qty: 4 }]);
  const [draft, setDraft] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [msgIntro, setMsgIntro] = useState("Hola 👋 Te comparto opciones disponibles:");
  const [msgOutro, setMsgOutro] = useState("¿Te aparto alguna opción?");
  const [msgNote, setMsgNote] = useState("");

  function buildPreviewText() {
    return "Preview OK";
  }

  function openWhatsapp() {
    if (!draft) return;
    const text = buildPreviewText();
    const url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
  }

  function prepareEmail() {
    const subject = `Llantitune Cotización`;
    const body = buildPreviewText();
    const mailto = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <div>
      <button onClick={openWhatsapp}>Abrir WhatsApp</button>
      <button onClick={prepareEmail}>Correo</button>
      <pre>{status}</pre>
    </div>
  );
}