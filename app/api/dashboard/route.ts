import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDays(n: number) {
  const out: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(toDateKey(d));
  }
  return out;
}

export async function GET() {
  try {
    // Range: last 30 days for aggregates (safe default)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: quotes, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(2500);

    if (qErr) throw qErr;

    const quoteIds = (quotes ?? []).map((q: any) => q.quote_id).filter(Boolean);

    // NOTE: Some installs do not include created_at in quote_lines / quote_items.
    // To keep the dashboard functional without changing business logic, we scope
    // to the last 30d *quotes* and then pull related rows by quote_id.

    const linesSafe: any[] = [];
    let lErr: any = null;
    if (quoteIds.length) {
      // chunk .in() to avoid query limits
      for (let i = 0; i < quoteIds.length; i += 400) {
        const chunk = quoteIds.slice(i, i + 400);
        const { data, error } = await supabaseAdmin
          .from("quote_lines")
          .select("quote_id, size")
          .in("quote_id", chunk)
          .limit(6000);
        if (error) {
          lErr = error;
          break;
        }
        linesSafe.push(...(data ?? []));
      }
    }

    const itemsSafe: any[] = [];
    let iErr: any = null;
    if (quoteIds.length) {
      for (let i = 0; i < quoteIds.length; i += 250) {
        const chunk = quoteIds.slice(i, i + 250);
        const { data, error } = await supabaseAdmin
          .from("quote_items")
          .select("quote_id, brand, included")
          .in("quote_id", chunk)
          .limit(9000);
        if (error) {
          iErr = error;
          break;
        }
        itemsSafe.push(...(data ?? []));
      }
    }

    const { data: orders, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_id, status, created_at")
      .gte("created_at", since.toISOString())
      .limit(2500);

    const ordersSafe = oErr ? [] : (orders ?? []);

    // Quotes per day (last 14 days)
    const dayKeys = lastNDays(14);
    const perDay: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));

    for (const q of quotes ?? []) {
      const createdAt = (q as any).created_at ? new Date((q as any).created_at) : null;
      if (!createdAt) continue;
      const k = toDateKey(createdAt);
      if (k in perDay) perDay[k] += 1;
    }

    // Most active weekday (Mon-Sun)
    const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const weekdayCounts: Record<string, number> = Object.fromEntries(weekdayNames.map((d) => [d, 0]));
    for (const q of quotes ?? []) {
      const createdAt = (q as any).created_at ? new Date((q as any).created_at) : null;
      if (!createdAt) continue;
      weekdayCounts[weekdayNames[createdAt.getDay()]] += 1;
    }

    // Top sizes (quote_lines.size)
    const sizeCounts = new Map<string, number>();
    for (const ln of linesSafe) {
      const s = String((ln as any).size ?? "").trim();
      if (!s) continue;
      sizeCounts.set(s, (sizeCounts.get(s) ?? 0) + 1);
    }
    const topSizes = [...sizeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([size, count]) => ({ size, count }));

    // Top brands (only included items if present)
    const brandCounts = new Map<string, number>();
    for (const it of itemsSafe) {
      const included = (it as any).included;
      if (included === false) continue;
      const b = String((it as any).brand ?? "").trim();
      if (!b) continue;
      brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1);
    }
    const topBrands = [...brandCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([brand, count]) => ({ brand, count }));

    // Active orders
    const activeOrders = ordersSafe.filter((o: any) => String(o.status ?? "").toUpperCase() !== "CLOSED").length;

    return NextResponse.json({
      ok: true,
      rangeDays: 30,
      totals: {
        quotes30d: (quotes ?? []).length,
        orders30d: ordersSafe.length,
        activeOrders,
        quoteIds: quoteIds.length,
      },
      quotesPerDay14d: dayKeys.map((k) => ({ day: k, count: perDay[k] ?? 0 })),
      weekdayCounts,
      topSizes,
      topBrands,
      warnings: {
        quote_lines: lErr ? "No se pudo leer quote_lines (permisos o esquema distinto)." : null,
        quote_items: iErr ? "No se pudo leer quote_items (permisos o esquema distinto)." : null,
        orders: oErr ? "No se pudo leer orders." : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
