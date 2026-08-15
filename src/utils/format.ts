/** Pemformat tampilan — versi TypeScript dari helper di aplikasi lama. */

import logoFallback from '@/assets/img/logo-kominfo-icon.png'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

const EM_DASH = '—'

function parse(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "14 Agu 2026" */
export function fmtDate(value?: string | null): string {
  const date = parse(value)
  if (!date) return EM_DASH
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "14 Agu 2026 19:30" */
export function fmtDateTime(value?: string | null): string {
  const date = parse(value)
  if (!date) return EM_DASH
  return `${fmtDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "19:30" dari nilai TIME backend ("19:30:00"). */
export function fmtTime(value?: string | null): string {
  if (!value) return EM_DASH
  return value.slice(0, 5)
}

/** "Rp 1.500.000" */
export function fmtRupiah(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return EM_DASH
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(numeric)) return EM_DASH
  return `Rp ${Math.round(numeric).toLocaleString('id-ID')}`
}

/** Stok alat berunit, mis. "250 meter". Desimal .00 dibuang agar enak dibaca. */
export function fmtStock(quantity?: string | number | null, unit?: string | null): string {
  if (!unit) return EM_DASH
  const numeric = typeof quantity === 'string' ? Number.parseFloat(quantity) : (quantity ?? 0)
  if (Number.isNaN(numeric)) return EM_DASH
  const text = Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(2)))
  return `${text} ${unit}`
}

/**
 * Foto alat / pengguna. Logo Diskominfo dipakai bila belum ada foto, sehingga
 * tidak pernah ada kotak gambar rusak di tabel maupun kartu.
 */
export function photoUrl(url?: string | null): string {
  return url || logoFallback
}

export { EM_DASH, logoFallback }
