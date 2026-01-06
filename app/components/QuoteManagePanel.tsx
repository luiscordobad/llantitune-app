
"use client";
import { useEffect, useState } from "react";

export default function QuoteManagePanel({ open, quoteId, onClose }: any) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quoteId) return;
    fetch(`/api/quotes/get?id=${quoteId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Error cargando cotización"));
  }, [open, quoteId]);

  if (!open) return null;

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
      <div style={{background:'#fff', padding:24, borderRadius:12, width:480}}>
        <h3>Gestionar cotización</h3>
        {error && <p style={{color:'red'}}>{error}</p>}
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
