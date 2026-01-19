import Link from "next/link";
import QuoteDetailClient from "./quote-detail-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage(props: PageProps) {
  const { id } = await props.params;
  const supabase = await createClient();

  // Quote header
  const { data: quote, error: quoteErr } = await supabase
    .from("quotes")
    .select(
      "quote_id,quote_number,customer_name,customer_email,vehicle_text,status"
    )
    .eq("quote_id", id)
    .maybeSingle();

  if (quoteErr) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Quote detail</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{quoteErr.message}</pre>
        <Link href="/admin/quotes">Back</Link>
      </div>
    );
  }

  // Lines for grouping (one per requested tire size)
  const { data: lines = [] } = await supabase
    .from("quote_lines")
    .select(
      "line_id,quote_id,line_no,size,quantity,vehicle_make,vehicle_model,vehicle_year,selected_quote_item_id"
    )
    .eq("quote_id", id)
    .order("line_no", { ascending: true });

  // Quote items (options)
  const { data: items = [] } = await supabase
    .from("quote_items")
    .select(
      "quote_item_id,quote_id,line_id,quote_line_id,provider,sku,stock,brand,model,load_speed,size,cost,price_each,total_tires,total_with_services,included"
    )
    .eq("quote_id", id)
    .order("rank", { ascending: true });

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin/quotes" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
          <h1 style={{ margin: 0, fontSize: 22 }}>
            Cotizaci&oacute;n #{quote?.quote_number ?? id}
          </h1>
        </div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Status: <b>{quote?.status ?? "—"}</b>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
        Cliente: <b>{quote?.customer_name ?? "—"}</b> | Email: <b>{quote?.customer_email ?? "—"}</b> | Veh&iacute;culo: <b>{quote?.vehicle_text ?? "—"}</b>
      </div>

      <div style={{ marginTop: 18 }}>
        <QuoteDetailClient quote={quote} lines={lines} items={items} />
      </div>
    </div>
  );
}
