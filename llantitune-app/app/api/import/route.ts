import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canonicalBrand, extractLoadSpeed, extractRim, normalizeSizeAny, pickInvBrandAfterSize, safeNumber } from "@/lib/normalize";
import { tireIdA } from "@/lib/tireId";

export const runtime = "nodejs";

async function readFirstSheet(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null }) as any[];
}

function detectDateFromFilename(name: string): string {
  const m = name.match(/(\d{2})(\d{2})(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const m2 = name.toUpperCase().match(/(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\w*\s+(\d{4})/);
  if (m2) {
    const map: any = { ENE:"01", FEB:"02", MAR:"03", ABR:"04", MAY:"05", JUN:"06", JUL:"07", AGO:"08", SEP:"09", OCT:"10", NOV:"11", DIC:"12" };
    const dd = String(m2[1]).padStart(2,"0");
    return `${m2[3]}-${map[m2[2]]}-${dd}`;
  }

  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prod = form.get("prodynamics") as File;
    const cot = form.get("cotizador") as File;
    const inv = form.get("inv") as File;

    if (!prod || !cot || !inv) {
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    const { data: brandRows, error: brandErr } = await supabaseAdmin
      .from("brand_dictionary")
      .select("brand_raw, brand_preferred");
    if (brandErr) throw brandErr;

    const dict: Record<string, string> = {};
    for (const r of brandRows ?? []) dict[String(r.brand_raw).toUpperCase()] = r.brand_preferred;

    const prodRows = await readFirstSheet(prod);
    const cotRows = await readFirstSheet(cot);
    const invRows = await readFirstSheet(inv);

    const snapshotProd = detectDateFromFilename(prod.name);
    const snapshotCot = detectDateFromFilename(cot.name);
    const snapshotInv = detectDateFromFilename(inv.name);

    const offers: any[] = [];

    // Prodynamics
    for (const r of prodRows) {
      const desc = r["Descripción"] ?? r["Descripcion"] ?? null;
      const size = normalizeSizeAny(desc);
      const rim = extractRim(size);
      const load = extractLoadSpeed(desc);
      const brandRaw = r["Marca"] ?? null;
      const brand = canonicalBrand(brandRaw, desc, dict);
      const model = String(desc ?? "").trim();
      const tire_id = size && brand ? await tireIdA(size, brand, model, load) : null;

      offers.push({
        llantitune_id: "LLANTITUNE",
        snapshot_date: snapshotProd,
        provider: "Prodynamics",
        sku: String(r["Sku"] ?? ""),
        tire_id,
        size,
        rim,
        brand_raw: brandRaw,
        brand,
        model,
        load_speed: load,
        description: desc,
        stock: safeNumber(r["Existencias"]),
        cost: safeNumber(r["Precio Neto"])
      });
    }

    // Cotizador
    for (const r of cotRows) {
      const desc = r["DESCRIPCIÓN"] ?? r["DESCRIPCION"] ?? null;
      const size = normalizeSizeAny(desc);
      const rim = extractRim(size);
      const load = extractLoadSpeed(desc);
      const brandRaw = r["MARCA"] ?? null;
      const brand = canonicalBrand(brandRaw, desc, dict);
      const model = String(desc ?? "").trim();
      const tire_id = size && brand ? await tireIdA(size, brand, model, load) : null;

      offers.push({
        llantitune_id: "LLANTITUNE",
        snapshot_date: snapshotCot,
        provider: "Cotizador",
        sku: String(r["ARTÍCULO"] ?? r["ARTICULO"] ?? ""),
        tire_id,
        size,
        rim,
        brand_raw: brandRaw,
        brand,
        model,
        load_speed: load,
        description: desc,
        stock: safeNumber(r["QRO"]),
        cost: safeNumber(r["MAYOREO"])
      });
    }

    // INV
    for (const r of invRows) {
      const desc = r["DESCRIPCION"] ?? r["DESCRIPCIÓN"] ?? null;
      const size = normalizeSizeAny(desc);
      const rim = extractRim(size);
      const load = extractLoadSpeed(desc);
      const brandRaw = pickInvBrandAfterSize(desc);
      const brand = canonicalBrand(brandRaw, desc, dict);
      const model = String(desc ?? "").trim();
      const tire_id = size && brand ? await tireIdA(size, brand, model, load) : null;

      offers.push({
        llantitune_id: "LLANTITUNE",
        snapshot_date: snapshotInv,
        provider: "INV",
        sku: String(r["PRODUCTO"] ?? ""),
        tire_id,
        size,
        rim,
        brand_raw: brandRaw,
        brand,
        model,
        load_speed: load,
        description: desc,
        stock: safeNumber(r["EXISTENCIA"]),
        cost: safeNumber(r["PRIMERA COLUMNA*"])
      });
    }

    const { error: insErr } = await supabaseAdmin.from("offers").insert(offers);
    if (insErr) throw insErr;

    const masterMap = new Map<string, any>();
    for (const o of offers) {
      if (!o.tire_id || !o.size || !o.brand) continue;
      if (!masterMap.has(o.tire_id)) {
        masterMap.set(o.tire_id, {
          tire_id: o.tire_id,
          size: o.size,
          rim: o.rim,
          brand: o.brand,
          model: o.model,
          load_speed: o.load_speed,
          description: o.description
        });
      }
    }
    const uniqueMaster = Array.from(masterMap.values());

    const { error: upErr } = await supabaseAdmin
      .from("master_tires")
      .upsert(uniqueMaster, { onConflict: "tire_id" });
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, offersInserted: offers.length, masterUpserts: uniqueMaster.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
