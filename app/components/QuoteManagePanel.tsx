
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteManagePanel({
  open,
  quoteId,
  onClose,
}: {
  open: boolean;
  quoteId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quoteId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/quotes/${quoteId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Error cargando cotización"))
      .finally(() => setLoading(false));
  }, [open, quoteId]);

  if (!open) return null;

  return (
    <div className="ltDrawerOverlay">
      <div className="ltDrawer">
        <div className="ltDrawerHeader">
          <b>Gestionar cotización</b>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="ltDrawerBody">
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: "red" }}>{error}</div>}

          {data && (
            <>
              <div><b>Folio:</b> {data.quote?.quote_number ?? "-"}</div>
              <div><b>Status:</b> {data.quote?.status ?? "-"}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
