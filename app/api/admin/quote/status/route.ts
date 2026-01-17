import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type DraftOption = {
  tierLabel?: string;
  tier?: string;
  brand?: string;
  model?: string;
  loadSpeed?: string;
  provider?: string;
  sku?: string;
  tire_id?: string;
  priceEach?: number;
  price_each?: number;
  quotedQty?: number;
  qty?: number;
  total?: number;
  included?: boolean;
};

type DraftLine = {
  lineId?: string;
  line_id?: string;
  size?: string;
  requestedQty?: number;
  requested_qty?: number;
  vehicle?: any;
  vehicle_text?: string;
  options?: DraftOption[];
};

type Draft = {
  quoteId?: string;
  quote_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  internal_notes?: string;
  deposit_amount?: number;
  promised_at?: string;
  lines?: DraftLine[];
};

function generateQuoteNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `LT-${yyyy}${mm}${dd}-${rand}`;
}

function num(v: unknown, fallback = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function vehicleToText(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const make = v.make ?? v.brand ?? "";
    const model = v.model ?? "";
    const year = v.year ?? "";
    return [make, model, year].filter(Boolean).join(" ").trim();
  }
  return String(v);
}

function lineIdOf(line: DraftLine, idx: number) {
  return line.line_id || line.lineId || `L${idx + 1}`;
}

function tierOf(opt: DraftOption) {
  return (opt.tierLabel || opt.tier || "").trim();
}

function priceEachOf(opt: DraftOption) {
  return num(opt.price_each ?? opt.priceEach, 0);
}

function qtyOf(opt: DraftOption) {
  return num(opt.qty ?? opt.quotedQty, 0);
}

function isIncluded(opt: DraftOption) {
  // In the UI, options may omit the flag; default to included.
  return opt.included !== false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const status = body?.status as string | undefined;
    const draft = body?.draft as Draft | undefined;

    if (!draft) {
      return NextResponse.json(
        { ok: false, error: "Draft data is required in request body." },
        { status: 400 }
      );
    }

    if (status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "Unsupported status." },
        { status: 400 }
      );
    }

    const quoteId = draft.quote_id || draft.quoteId;
    if (!quoteId) {
      return NextResponse.json(
        { ok: false, error: "quoteId is required in draft." },
        { status: 400 }
      );
    }

    const lines = Array.isArray(draft.lines) ? draft.lines : [];
    if (lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Draft must include at least one line." },
        { status: 400 }
      );
    }

    const quoteNumber = generateQuoteNumber();

    // 1) Upsert quote header
    const header: Record<string, any> = {
      quote_id: quoteId,
      quote_number: quoteNumber,
      status: "SENT",
      customer_name: (draft.customer_name || "").trim(),
      customer_phone: (draft.customer_phone || "").trim() || null,
      customer_email: (draft.customer_email || "").trim() || null,
      notes: (draft.notes || "").trim() || null,
      internal_notes: (draft.internal_notes || "").trim() || null,
      deposit_amount: num(draft.deposit_amount, 0),
      promised_at: draft.promised_at || null,
    };

    const { data: quoteRow, error: quoteErr } = await supabaseAdmin
      .from("quotes")
      .upsert(header, { onConflict: "quote_id" })
      .select("quote_id, quote_number")
      .single();

    if (quoteErr) {
      throw new Error(`Supabase quotes upsert failed: ${quoteErr.message}`);
    }

    // 2) Replace lines/items for this quote (idempotent)
    const delItems = await supabaseAdmin.from("quote_items").delete().eq("quote_id", quoteId);
    if (delItems.error) {
      throw new Error(`Supabase quote_items delete failed: ${delItems.error.message}`);
    }

    const delLines = await supabaseAdmin.from("quote_lines").delete().eq("quote_id", quoteId);
    if (delLines.error) {
      throw new Error(`Supabase quote_lines delete failed: ${delLines.error.message}`);
    }

    const lineRows = lines.map((ln, idx) => {
      const vehicleText = (ln.vehicle_text || vehicleToText(ln.vehicle)).trim() || null;
      const quantity = num(ln.requested_qty ?? ln.requestedQty, 0);
      return {
        quote_id: quoteId,
        line_id: lineIdOf(ln, idx),
        line_no: idx + 1,
        size: (ln.size || "").trim(),
        quantity,
        vehicle_text: vehicleText,
      };
    });

    const { error: lineInsErr } = await supabaseAdmin.from("quote_lines").insert(lineRows);
    if (lineInsErr) {
      throw new Error(`Supabase quote_lines insert failed: ${lineInsErr.message}`);
    }

    const itemRows: any[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const ln = lines[i];
      const lineId = lineIdOf(ln, i);
      const options = Array.isArray(ln.options) ? ln.options : [];

      let rank = 1;
      for (const opt of options) {
        if (!isIncluded(opt)) continue;

        const quantity = qtyOf(opt);
        const priceEach = priceEachOf(opt);
        const total = num(opt.total, priceEach * quantity);

        itemRows.push({
          quote_id: quoteId,
          line_id: lineId,
          rank,
          tier: tierOf(opt) || null,
          brand: (opt.brand || "").trim() || null,
          model: (opt.model || "").trim() || null,
          load_speed: (opt.loadSpeed || "").trim() || null,
          provider: (opt.provider || "").trim() || null,
          sku: (opt.sku || "").trim() || null,
          tire_id: (opt.tire_id || "").trim() || null,
          price_each: priceEach,
          quantity,
          total,
          included: true,
        });
        rank += 1;
      }
    }

    if (itemRows.length > 0) {
      const { error: itemInsErr } = await supabaseAdmin.from("quote_items").insert(itemRows);
      if (itemInsErr) {
        throw new Error(`Supabase quote_items insert failed: ${itemInsErr.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      quoteId: quoteRow?.quote_id || quoteId,
      quoteNumber: quoteRow?.quote_number || quoteNumber,
      status: "SENT",
    });
  } catch (err: any) {
    console.error("/api/admin/quote/status error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
