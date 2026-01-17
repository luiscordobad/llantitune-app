"use client";

import { useState } from "react";

export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [isSent, setIsSent] = useState(false);

  // =========================
  // 🔥 FUNCIÓN CORRECTA (AQUÍ SÍ VA)
  // =========================
  async function sendAndAssignFolio() {
    try {
      if (!draft || !draft.lines?.length) {
        setStatus("Error: Draft incompleto");
        return;
      }

      setStatus("Enviando y asignando folio...");

      const res = await fetch("/api/admin/quote/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SENT",
          draft,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("Error: " + (data.error ?? "Error desconocido"));
        return;
      }

      setDraft({
        ...draft,
        quoteNumber: data.quoteNumber,
      });

      setIsSent(true);
      setStatus("Cotización enviada correctamente ✅");
    } catch (err: any) {
      console.error(err);
      setStatus("Error al enviar cotización");
    }
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Cotizador Llantitune</h2>

      <div style={{ marginTop: 10, color: "#555" }}>{status}</div>

      {/* SOLO PARA DEMO: SIMULAMOS QUE YA EXISTE DRAFT */}
      {step === 5 && !draft && (
        <button
          onClick={() =>
            setDraft({
              customer_name: "Cliente Demo",
              customer_phone: "0000000000",
              customer_email: "demo@email.com",
              lines: [
                {
                  size: "215/55R16",
                  requested_qty: 4,
                  options: [
                    {
                      tier: "Premium",
                      brand: "Michelin",
                      model: "Primacy",
                      price_each: 2500,
                      qty: 4,
                      total: 10000,
                    },
                  ],
                },
              ],
            })
          }
        >
          Simular draft (solo prueba)
        </button>
      )}

      {step === 5 && draft ? (
        <div style={{ marginTop: 20 }}>
          <div>
            <b>Folio:</b> {draft.quoteNumber ?? "BORRADOR"}
          </div>

          <button
            onClick={sendAndAssignFolio}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
            }}
          >
            Enviar (generar folio)
          </button>
        </div>
      ) : null}
    </div>
  );
}
