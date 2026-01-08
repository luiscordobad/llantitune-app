export function normalizeSizeAny(text?: string | null): string | null {
  if (!text) return null;
  const s = String(text).toUpperCase().replace(/\s+/g, "");
  const m = s.match(/(\d{3})\/(\d{2,3})\/?(ZR|R)(\d{2})/);
  if (m) return `${m[1]}/${m[2]}${m[3]}${m[4]}`;
  const f = s.match(/(\d{2,3})X(\d{1,2}\.?\d{0,2})R(\d{2})/);
  if (f) return `${f[1]}X${f[2]}R${f[3]}`;
  return null;
}

export function extractRim(size?: string | null): number | null {
  if (!size) return null;
  const m = size.toUpperCase().match(/R(\d{2})/);
  return m ? Number(m[1]) : null;
}

export function extractLoadSpeed(desc?: string | null): string | null {
  if (!desc) return null;
  const s = String(desc).toUpperCase();
  const m = s.match(/\b(\d{2,3}(?:\/\d{2,3})?\s*[A-Z]{1,2})\b/);
  return m ? m[1].replace(" ", "") : null;
}

export function pickInvBrandAfterSize(desc?: string | null): string | null {
  if (!desc) return null;
  const tokens = String(desc).trim().split(/\s+/);
  const isSizeToken = (t: string) => /P?\d{3}\/\d{2,3}\/?(ZR|R)\d{2}/i.test(t.replace(/\s+/g, ""));
  const idx = tokens.findIndex(isSizeToken);
  if (idx >= 0 && idx + 1 < tokens.length) {
    const candidate = tokens[idx + 1].toUpperCase();
    if (/^\d{2,3}(?:\/\d{2,3})?[A-Z]{1,2}$/.test(candidate) && idx + 2 < tokens.length) {
      return tokens[idx + 2].toUpperCase();
    }
    return candidate;
  }
  return null;
}

export function canonicalBrand(
  brandRaw?: string | null,
  desc?: string | null,
  dict?: Record<string, string>
): string | null {
  const raw = (brandRaw ?? "").toUpperCase().trim();
  const d = (desc ?? "").toUpperCase();

  if (dict) {
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (k && d.includes(k)) return dict[k];
    }
    if (raw && dict[raw]) return dict[raw];
  }
  if (!raw) return null;
  return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
