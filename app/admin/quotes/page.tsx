
"use client";

import { useState } from "react";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function QuotesPage() {
  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  return (
    <div>
      <button className="btn btnPrimary" onClick={() => setManageQuoteId("demo-id")}>
        Gestionar
      </button>

      <QuoteManagePanel
        open={Boolean(manageQuoteId)}
        quoteId={manageQuoteId}
        onClose={() => setManageQuoteId(null)}
      />
    </div>
  );
}
