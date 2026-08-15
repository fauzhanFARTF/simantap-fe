/**
 * Kandidat nomor saat mencocokkan hasil pindai QR.
 *
 * Nomor aset sempat berubah BMN → BMD → DISKOMINFO, tetapi stiker QR yang
 * terlanjur tertempel di alat masih berisi format lama. Tanpa toleransi ini
 * seluruh stiker lama mati di lapangan.
 *
 * Kembarannya ada di backend (`apps/core/utils.py::barcode_candidates`) — versi
 * di sini hanya dipakai untuk mengenali alat berstok saat kodenya diketik,
 * sedangkan pencocokan yang menentukan tetap dilakukan server.
 */

const PREFIXES = ['BMN-', 'BMD-', 'DISKOMINFO-'] as const

export function barcodeCandidates(scanned: string): string[] {
  const code = (scanned ?? '').trim()
  const candidates = [code]

  for (const prefix of PREFIXES) {
    if (!code.toUpperCase().startsWith(prefix)) continue
    const rest = code.slice(prefix.length)
    candidates.push(...PREFIXES.filter((other) => other !== prefix).map((other) => other + rest))
    break
  }
  return candidates
}
