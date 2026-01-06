
"use client";
import { useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function QuotesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <button onClick={() => setSelected("test-quote-id")}>Gestionar</button>
      {selected && <QuoteManagePanel quoteId={selected} />}
    </div>
  );
}
