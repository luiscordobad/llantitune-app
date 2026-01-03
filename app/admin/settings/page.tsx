"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [markup, setMarkup] = useState(30);
  const [install, setInstall] = useState(1000);
  const [extras, setExtras] = useState(1000);
  const [minStock, setMinStock] = useState(8);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const s = data.settings ?? {};
      setMarkup(Number(s.default_markup_pct ?? 30));
      setInstall(Number(s.default_install_each ?? 1000));
      setExtras(Number(s.default_extras_each ?? 1000));
      setMinStock(Number(s.default_min_stock ?? 8));
      setLoading(false);
    })();
  }, []);

  async function save() {
    setMsg("Guardando...");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        default_markup_pct: Number(markup),
        default_install_each: Number(install),
        default_extras_each: Number(extras),
        default_min_stock: Number(minStock)
      })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(`Error: ${data.error ?? "unknown"}`);
    setMsg("OK ✅ Guardado");
  }

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Ajustes</h2>
      <p style={{ color: "#555" }}>Estos valores se usan como defaults en el cotizador.</p>

      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <label>Markup default % <input type="text" inputMode="numeric" pattern="[0-9]*" value={markup} onChange={e => setMarkup(Number(e.target.value))} /></label>
        <label>Instalación por llanta <input type="text" inputMode="numeric" pattern="[0-9]*" value={install} onChange={e => setInstall(Number(e.target.value))} /></label>
        <label>Extras por llanta <input type="text" inputMode="numeric" pattern="[0-9]*" value={extras} onChange={e => setExtras(Number(e.target.value))} /></label>
        <label>Stock mínimo <input type="text" inputMode="numeric" pattern="[0-9]*" value={minStock} onChange={e => setMinStock(Number(e.target.value))} /></label>

        <button onClick={save} style={{ width: 180 }}>Guardar</button>
      </div>

      <div style={{ marginTop: 12, color: "#555" }}>{msg}</div>
    </div>
  );
}
