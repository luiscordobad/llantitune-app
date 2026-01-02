"use client";

import { useState } from "react";

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
    <div style={{ maxWidth: 900 }}>
      <h2>Importar listas</h2>
      <p style={{ color: "#555" }}>
        Sube los 3 archivos (Prodynamics / Cotizador / INV). Se normalizan con las reglas de Llantitune y se guardan en Supabase.
      </p>

      <form onSubmit={onSubmit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>Prodynamics (.xlsx) <input name="prodynamics" type="file" accept=".xlsx" required /></label>
          <label>Cotizador (.xlsx) <input name="cotizador" type="file" accept=".xlsx" required /></label>
          <label>INV (.xlsx) <input name="inv" type="file" accept=".xlsx" required /></label>
          <button type="submit" style={{ width: 160 }}>Importar</button>
        </div>
      </form>

      <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12, whiteSpace: "pre-wrap" }}>{status}</pre>
    </div>
  );
}
