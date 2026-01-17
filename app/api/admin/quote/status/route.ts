import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

function nowIso() {
  return new Date().toISOString();
}

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function uuid(): string {
  // Node runtime (Vercel) supports crypto.randomUUID via import
  return randomUUID();
}

function normalizeStatus(v: unknown): QuoteStatus {
  const s = String(v ?? "").toUpperCase();
  if (s === "SENT" || s === "APPROVED" || s === "REJECTED" || s === "DRAFT") return s;
  return "DRAFT";
}

async function getNextQuoteNumberFallback(): Promise<string> {
  // Try DB function created in migrations; fallback to timestamp format
  try {
    const { data, error } = await supabaseAdmin.rpc("next_quote_number");
    if (!error && data) return String(data);
  } catch {
    // ignore
  }
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-4);
  return `LT-${y}${m}${day}-${t}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const status = normalizeStatus(body?.status);
    const draft = body?.draft ?? {};

    const quoteId: string | null =
      (typeof draft?.quote_id === "string" && draft.quote_id) ||
      (typeof draft?.quoteId === "string" && draft.quoteId) ||
      null;

    if (!quoteId) {
      return NextResponse.json({ error: "quoteId is required in draft." }, { status: 400 });
    }

    // Header fields (explained: you may not have all of these in the UI yet; that's OK)
    const headerPayload: Record<string, any> = {
      quote_id: quoteId,
      status,
      customer_name: draft?.customerName ?? null,
      customer_phone: draft?.customerPhone ?? null,
      customer_email: draft?.customerEmail ?? null,
      vehicle_text: draft?.vehicleText ?? null,
      urgency: draft?.urgency ?? null,
      preference: draft?.preference ?? null,
      notes: draft?.notes ?? null,
      internal_notes: draft?.internalNotes ?? null,
      deposit_amount: draft?.depositAmount ?? null,
      promised_at: draft?.promisedAt ?? null,
      min_stock: draft?.minStock ?? null,
      markup_pct: draft?.markupPct ?? draft?.markup ?? null,
      install_each: draft?.installEach ?? draft?.install ?? null,
      extras_each: draft?.extrasEach ?? draft?.extras ?? null,
      vehicle_make: draft?.vehicleMake ?? null,
      vehicle_model: draft?.vehicleModel ?? null,
      vehicle_year: draft?.vehicleYear ?? null,
    };

    // Status timestamps
    const tsNow = nowIso();
    if (status === "SENT") headerPayload.sent_at = tsNow;
    if (status === "APPROVED") headerPayload.approved_at = tsNow;
    if (status === "REJECTED") headerPayload.rejected_at = tsNow;

    // Quote number on send
    if (status === "SENT") {
      const existingFromDraft =
        (typeof draft?.quote_number === "string" && draft.quote_number) ||
        (typeof draft?.quoteNumber === "string" && draft.quoteNumber) ||
        (typeof draft?.quote_number_text === "string" && draft.quote_number_text) ||
        (typeof draft?.quoteNumberText === "string" && draft.quoteNumberText) ||
        null;

      headerPayload.quote_number = existingFromDraft || (await getNextQuoteNumberFallback());
    }

    // Upsert quote header (quote_id is PK)
    {
      const { error } = await supabaseAdmin
        .from("quotes")
        .upsert(headerPayload, { onConflict: "quote_id" });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Only persist lines/items when sending (keeps drafts light)
    if (status === "SENT") {
      const lines: any[] = Array.isArray(draft?.lines) ? draft.lines : [];
      const vehicles: any[] = Array.isArray(draft?.vehicles) ? draft.vehicles : [];

      // Reset previous persisted lines/items (idempotent)
      {
        const delItems = await supabaseAdmin.from("quote_items").delete().eq("quote_id", quoteId);
        if (delItems.error) {
          return NextResponse.json({ error: delItems.error.message }, { status: 500 });
        }
        const delLines = await supabaseAdmin.from("quote_lines").delete().eq("quote_id", quoteId);
        if (delLines.error) {
          return NextResponse.json({ error: delLines.error.message }, { status: 500 });
        }
      }

      // Build quote_lines rows
      const lineRows = lines.map((ln, idx) => {
        const vehicleIndex = asNumber(ln?.vehicleIndex, 0);
        const v = vehicles[vehicleIndex] ?? {};
        const line_id = (globalThis.crypto as any)?.randomUUID?.() ?? require("crypto").randomUUID();
        return {
          line_id,
          quote_id: quoteId,
          line_no: idx + 1,
          size: String(ln?.size ?? "").trim(),
          quantity: asNumber(ln?.quantity, 1) || 1,
          vehicle_make: v?.make ?? null,
          vehicle_model: v?.model ?? null,
          vehicle_year: v?.year ?? null,
          vehicle_index: Number.isFinite(vehicleIndex) ? vehicleIndex : null,
        };
      });

      // Validate at least one line with size
      const validLineRows = lineRows.filter((r) => r.size);

      if (validLineRows.length === 0) {
        return NextResponse.json(
          { error: "At least one line with a valid size is required to send." },
          { status: 400 }
        );
      }

      {
        const { error } = await supabaseAdmin.from("quote_lines").insert(validLineRows);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      // Build quote_items rows
      const installEach = asNumber(draft?.installEach ?? draft?.install, 0);
      const extrasEach = asNumber(draft?.extrasEach ?? draft?.extras, 0);

      const itemRows: any[] = [];
      const selectedByLine: Array<{ line_id: string; selected_quote_item_id: string }> = [];

      validLineRows.forEach((lr, idx) => {
        const ln = lines[idx] ?? {};
        const qty = asNumber(ln?.quantity, 1) || 1;
        const options: any[] = Array.isArray(ln?.options) ? ln.options : [];

        // Keep ordering stable
        options.forEach((opt, rank) => {
          const quote_item_id =
            (typeof opt?.quoteItemId === "string" && opt.quoteItemId) ||
            (typeof opt?.quote_item_id === "string" && opt.quote_item_id) ||
            ((globalThis.crypto as any)?.randomUUID?.() ?? require("crypto").randomUUID());

          const priceEach = asNumber(opt?.priceEach ?? opt?.price_each, 0);
          const totalTires = asNumber(opt?.totalTires ?? opt?.total_tires, priceEach * qty);
          const totalWithServices = asNumber(
            opt?.totalWithServices ?? opt?.total_with_services,
            totalTires + (installEach + extrasEach) * qty
          );

          itemRows.push({
            quote_item_id,
            quote_id: quoteId,
            line_id: lr.line_id,
            quote_line_id: lr.line_id,
            rank: Number.isFinite(rank) ? rank + 1 : null,
            provider: opt?.provider ?? null,
            sku: opt?.sku ?? null,
            tire_id: opt?.tireId ?? opt?.tire_id ?? null,
            brand: opt?.brand ?? null,
            model: opt?.model ?? null,
            load_speed: opt?.loadSpeed ?? opt?.load_speed ?? null,
            size: lr.size,
            stock: opt?.stock ?? null,
            cost: opt?.costEach ?? opt?.cost ?? null,
            price_each: priceEach,
            total_tires: totalTires,
            total_with_services: totalWithServices,
            included: typeof opt?.included === "boolean" ? opt.included : true,
          });
        });

        // selected option
        const selectedId =
          (typeof ln?.selectedOptionId === "string" && ln.selectedOptionId) ||
          (typeof ln?.selected_quote_item_id === "string" && ln.selected_quote_item_id) ||
          null;

        if (selectedId) {
          // selectedOptionId in UI refers to quoteItemId
          const found = itemRows.find((r) => r.line_id === lr.line_id && r.quote_item_id === selectedId);
          if (found) selectedByLine.push({ line_id: lr.line_id, selected_quote_item_id: found.quote_item_id });
        }
      });

      if (itemRows.length > 0) {
        const { error } = await supabaseAdmin.from("quote_items").insert(itemRows);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      // Update selected item per line
      for (const sel of selectedByLine) {
        const { error } = await supabaseAdmin
          .from("quote_lines")
          .update({ selected_quote_item_id: sel.selected_quote_item_id })
          .eq("line_id", sel.line_id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, quote_id: quoteId, status: headerPayload.status, quote_number: headerPayload.quote_number ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
