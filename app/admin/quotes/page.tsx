
import Link from "next/link";
import { getQuotes } from "@/lib/quotes/getQuotes";

function fmtVehicle(q: any) {
  const parts = [q.vehicle_make, q.vehicle_model, q.vehicle_year].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

export default async function QuotesPage() {
  const quotes = await getQuotes(200);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Cotizaciones</h1>
        <div style={{ color: "#666" }}>{quotes.length} registro(s)</div>
      </div>

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Folio</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Email</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Vehículo</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 10 }}>Min stock</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>ID</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q: any) => (
              <tr key={q.quote_id}>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                  <b>{q.quote_number ?? "—"}</b>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{q.customer_email ?? "—"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{fmtVehicle(q)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>{q.min_stock ?? "—"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", color: "#666" }}>
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}>
                    {q.quote_id}
                  </span>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                  <Link href={`/admin/quotes/${q.quote_id}`} style={{ textDecoration: "underline" }}>
                    Gestionar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
        Nota: Esta vista es tolerante a cambios de esquema. Si agregas columnas como <b>status</b>, <b>customer_name</b> o <b>created_at</b>, podemos enriquecer la gestión.
      </div>
    </div>
  );
}
