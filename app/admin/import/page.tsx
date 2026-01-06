"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";

export default function ImportPage() {
  const [status, setStatus] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Subiendo y normalizando...");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data.error ?? "unknown"}`);
      return;
    }
    setStatus(`OK ✅ Offers insertados: ${data.offersInserted} | Master upserts: ${data.masterUpserts}`);
  }

  return (
    <div>
      <PageHeader
        title="Importar listas"
        description="Sube los 3 archivos (Prodynamics / Cotizador / INV). Se normalizan con reglas de Llantitune y se guardan en Supabase."
      />

      <div className="card cardPadLg" style={{ maxWidth: 900 }}>
        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <div className="label">Prodynamics (.xlsx)</div>
              <input className="input" name="prodynamics" type="file" accept=".xlsx" required />
            </div>
            <div className="field">
              <div className="label">Cotizador (.xlsx)</div>
              <input className="input" name="cotizador" type="file" accept=".xlsx" required />
            </div>
            <div className="field">
              <div className="label">INV (.xlsx)</div>
              <input className="input" name="inv" type="file" accept=".xlsx" required />
            </div>

            <button type="submit" className="btn btnPrimary" style={{ width: 180 }}>Importar</button>
          </div>
        </form>
      </div>

      {status ? (
        <div className="card cardPadLg" style={{ marginTop: 14, maxWidth: 900 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{status}</pre>
        </div>
      ) : null}
    </div>
  );
}
