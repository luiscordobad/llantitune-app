"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * FIX SUMMARY
 * - Persist quoteId from backend correctly
 * - Add explicit approveQuote() using /api/quotes/approve
 * - Send quote_id, line_id, quote_item_id (UUIDs) exactly as DB expects
 * - Do NOT break cotización flow
 */

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
  return String(o.quote_item_id ?? `${lineId}::${o.sku ?? o.tire_id}`);
}

export default function QuotePage() {
  const [draft, setDraft] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  async function approveQuote(line: any, option: any) {
    try {
      setStatus("Aprobando cotización…");

      const res = await fetch("/api/quotes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: draft.quoteId ?? draft.quote_id,
          line_id: line.lineId ?? line.line_id,
          quote_item_id: option.quoteItemId ?? option.quote_item_id,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error approving quote");

      setStatus("✅ Cotización aprobada");
    } catch (err: any) {
      console.error(err);
      setStatus(err.message);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Cotización</h1>

      {!draft && (
        <div style={{ color: "#666" }}>
          Este archivo solo reemplaza la lógica de aprobación.
        </div>
      )}

      {draft?.lines?.map((ln: any) => (
        <div key={ln.lineId} style={{ marginTop: 16 }}>
          <h3>
            {ln.size} — {vehicleLabelFromLine(ln)}
          </h3>

          <table width="100%" cellPadding={6}>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ln.options.map((o: any) => (
                <tr key={makeOptionKey(ln.lineId, o)}>
                  <td>{o.brand}</td>
                  <td>{o.model}</td>
                  <td>{fmtMoney(o.totalTires)}</td>
                  <td>
                    <button onClick={() => approveQuote(ln, o)}>
                      Aprobar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ marginTop: 16, fontWeight: 600 }}>{status}</div>
    </div>
  );
}
