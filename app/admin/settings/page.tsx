"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";

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

  if (loading) return <div className="card cardPadLg"><span className="badge">Cargando...</span></div>;

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="Estos valores se usan como defaults en el cotizador."
        right={msg ? <span className="badge">{msg}</span> : null}
      />

      <div className="card cardPadLg" style={{ maxWidth: 520 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="field">
            <div className="label">Markup default %</div>
            <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={markup} onChange={e => setMarkup(Number(e.target.value))} />
          </div>
          <div className="field">
            <div className="label">Instalación por llanta</div>
            <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={install} onChange={e => setInstall(Number(e.target.value))} />
          </div>
          <div className="field">
            <div className="label">Extras por llanta</div>
            <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={extras} onChange={e => setExtras(Number(e.target.value))} />
          </div>
          <div className="field">
            <div className="label">Stock mínimo</div>
            <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={minStock} onChange={e => setMinStock(Number(e.target.value))} />
          </div>

          <button onClick={save} className="btn btnPrimary" style={{ width: 180 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
