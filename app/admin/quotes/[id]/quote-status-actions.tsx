"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

export default function QuoteStatusActions({
  quoteId,
  currentStatus,
}: {
  quoteId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: QuoteStatus) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quote/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  const status = (currentStatus ?? "").toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={loading || status === "APPROVED"}
          onClick={() => setStatus("APPROVED")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d6f0d6",
            background: status === "APPROVED" ? "#e8f8e8" : "#f7fff7",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={loading || status === "REJECTED"}
          onClick={() => setStatus("REJECTED")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ffd2d2",
            background: status === "REJECTED" ? "#ffecec" : "#fff7f7",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Reject
        </button>
        <button
          type="button"
          disabled={loading || status === "SENT"}
          onClick={() => setStatus("SENT")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: status === "SENT" ? "#f2f2f2" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Mark as SENT
        </button>
      </div>
      {error ? <div style={{ color: "crimson", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
