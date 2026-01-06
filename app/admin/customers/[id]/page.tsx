
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QuoteManagePanel from "@/app/components/QuoteManagePanel";

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id;

  const [manageQuoteId, setManageQuoteId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* ... resto del contenido del cliente ... */}

      <QuoteManagePanel
        open={Boolean(manageQuoteId)}
        quoteId={manageQuoteId ?? ""}
        onClose={() => setManageQuoteId(null)}
      />
    </div>
  );
}
