export async function md5Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function tireIdA(size: string, brand: string, model: string, loadSpeed: string | null) {
  const key = `${size}|${brand}|${model}|${loadSpeed ?? ""}`;
  const hex = await md5Hex(key);
  return hex.slice(0, 12);
}
