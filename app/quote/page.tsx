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

/* =========================
   Types
========================= */
type Vehicle = { make: string; model: string; year: string };
type Line = { vehicleIndex: number; size: string; qty: number };

export default function QuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<any>(null);

  /* =========================
     ✅ ADD — persist selection
  ========================= */
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

  /* =========================
     EXISTING FUNCTION (MODIFIED MINIMALLY)
  ========================= */
  async function setIncluded(
    optionKey: string,
    included: boolean,
    quoteItemId?: string
  ) {
    setDraft((prev: any) => {
      if (!prev) return prev;

      const lines = prev.lines.map((ln: any) => {
        let didSelect = false;

        const options = ln.options.map((o: any) => {
          if (String(o.optionKey) === String(optionKey)) {
            if (included && !ln.selectedQuoteItemId && quoteItemId) {
              didSelect = true;
            }
            return { ...o, included };
          }
          return o;
        });

        // ✅ ADD: auto-select first included option
        if (didSelect && quoteItemId) {
          persistSelectedItem(ln.lineId, quoteItemId);
          return {
            ...ln,
            selectedQuoteItemId: quoteItemId,
            options,
          };
        }

        return { ...ln, options };
      });

      return { ...prev, lines };
    });

    // existing include persistence
    if (!quoteItemId) return;
    await fetch("/api/quote/include", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteItemId, included }),
    });
  }

  /* =========================
     TODO: REST OF YOUR FILE
     ⛔️ SIN CAMBIOS
========================= */

  return (
    <div>
      {/* ⛔️ EL RESTO DE TU ARCHIVO PERMANECE EXACTAMENTE IGUAL */}
    </div>
  );
}
