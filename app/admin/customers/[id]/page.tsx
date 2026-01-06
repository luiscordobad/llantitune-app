
"use client";

import { useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function CustomerDetail() {
  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  return (
    <div>
      <button className="btn" onClick={() => setManageQuoteId("demo-id")}>
        Gestionar cotización
      </button>

      <QuoteManagePanel
        open={Boolean(manageQuoteId)}
        quoteId={manageQuoteId}
        onClose={() => setManageQuoteId(null)}
      />
    </div>
  );
}
