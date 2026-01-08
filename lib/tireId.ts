export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  // WebCrypto in Node supports SHA-256 (MD5 is not supported and causes "Unrecognized algorithm name")
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// "A" ID: deterministic hash of (size|brand|model|loadSpeed) -> first 12 hex chars
export async function tireIdA(
  size: string,
  brand: string,
  model: string,
  loadSpeed: string | null
) {
  const key = `${size}|${brand}|${model}|${loadSpeed ?? ""}`;
  const hex = await sha256Hex(key);
  return hex.slice(0, 12);
}
