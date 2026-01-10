// FIXED VERSION
"use client";

import { useState } from "react";

function fmtMoney(n:number){return "$"+(Number.isFinite(n)?n.toFixed(2):"0.00");}
function makeOptionKey(lineId:string,o:any){
  return String(o?.quoteItemId ?? o?.quote_item_id ?? `${lineId}::${o?.provider??""}`);
}

export default function QuotePage(){
  const [lines,setLines]=useState([{size:"",qty:4}]);
  const [draft,setDraft]=useState<any>(null);
  const [status,setStatus]=useState("");

  async function buildDraftAndShowOptions(){
    setStatus("Buscando llantas...");
    let res=await fetch("/api/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lines})});
    if(res.status===405){
      res=await fetch("/api/quote?draft=1");
    }
    const t=await res.text();
    let d:any;
    try{d=JSON.parse(t);}catch{setStatus("Respuesta inválida");return;}
    if(!res.ok){setStatus("Error API");return;}
    d.lines=(d.lines??[]).map((ln:any)=>{
      const id=String(ln.lineId??ln.line_id);
      return {...ln,lineId:id,options:(ln.options??[]).map((o:any)=>({...o,optionKey:makeOptionKey(id,o)}))};
    });
    setDraft(d);
    setStatus("OK");
  }

  async function approve(){
    if(!draft?.quoteId)return;
    await fetch("/api/admin/quote/approve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId:draft.quoteId})});
    setStatus("APROBADA");
  }

  return (
    <div>
      <h1>Cotizar</h1>
      <input value={lines[0].size} onChange={e=>setLines([{...lines[0],size:e.target.value}])}/>
      <button onClick={buildDraftAndShowOptions}>Ver llantas</button>
      <p>{status}</p>
      {draft&&(
        <div>
          {draft.lines.map((ln:any)=>(
            <div key={ln.lineId}>
              {ln.options.map((o:any)=>(
                <div key={o.optionKey}>{o.brand} {fmtMoney(o.priceEach)}</div>
              ))}
            </div>
          ))}
          <button onClick={approve}>Aprobar</button>
        </div>
      )}
    </div>
  );
}
