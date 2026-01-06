
"use client";

import { useEffect, useState } from "react";
import "./quote-manage-modal.css";

export default function QuoteManagePanel({
  open,
  quoteId,
  onClose,
}: {
  open: boolean;
  quoteId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quoteId) return;

    setLoading(true);
    fetch(`/api/quotes/${quoteId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Error cargando cotización"))
      .finally(() => setLoading(false));
  }, [open, quoteId]);

  if (!open) return null;

  return (
    <div className="ltModalOverlay">
      <div className="ltModal">
        <div className="ltModalHeader">
          <h3>Gestionar cotización</h3>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="ltModalBody">
          {loading && <p>Cargando…</p>}
          {error && <p className="error">{error}</p>}
          {data && (
            <>
              <p><b>Folio:</b> {data.quote?.quote_number}</p>
              <p><b>Cliente:</b> {data.quote?.customer_name}</p>
              <p><b>Estatus:</b> {data.quote?.status}</p>
            </>
          )}
        </div>

        <div className="ltModalFooter">
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
