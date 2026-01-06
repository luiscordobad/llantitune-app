
"use client";
import { useEffect, useState } from "react";

export default function QuoteManagePanel({ quoteId }: { quoteId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Error cargando cotización"));
  }, [quoteId]);

  if (error) return <div>{error}</div>;
  if (!data) return <div>Cargando cotización...</div>;

  return (
    <div>
      <h3>Gestionar cotización</h3>
      <p><b>Folio:</b> {data.folio}</p>
      <p><b>Status:</b> {data.status}</p>
    </div>
  );
}
