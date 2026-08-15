/**
 * Peta status → kelas lencana Bootstrap + labelnya.
 *
 * Salinan setia dari `status_badge()` di aplikasi lama, sehingga warna dan
 * tulisan lencana di setiap tabel tetap persis sama.
 */

type Badge = { cls: string; label: string }

const BADGES: Record<string, Badge> = {
  // Peminjaman
  Pending: { cls: 'bg-warning text-dark', label: 'Menunggu' },
  Approved: { cls: 'bg-info text-dark', label: 'Disetujui' },
  Rejected: { cls: 'bg-danger', label: 'Ditolak' },
  CheckedOut: { cls: 'bg-primary', label: 'Dipinjam' },
  Returned: { cls: 'bg-success', label: 'Dikembalikan' },
  Completed: { cls: 'bg-secondary', label: 'Selesai' },
  Cancelled: { cls: 'bg-dark', label: 'Dibatalkan' },

  // Alat
  Available: { cls: 'bg-success', label: 'Tersedia' },
  Booked: { cls: 'bg-warning text-dark', label: 'Dipesan' },
  Damaged: { cls: 'bg-danger', label: 'Rusak / Perbaikan' },
  Retired: { cls: 'bg-dark', label: 'Dihapus' },
  Lost: { cls: 'bg-dark', label: 'Hilang' },
  Habis: { cls: 'bg-dark', label: 'Habis' },
  AtOpd: { cls: 'bg-info text-dark', label: 'Di OPD' },

  // Perbaikan
  Open: { cls: 'bg-warning text-dark', label: 'Baru' },
  FormPrinted: { cls: 'bg-info text-dark', label: 'SPK Dicetak' },
  InRepair: { cls: 'bg-primary', label: 'Diperbaiki' },

  // Barang pada peminjaman
  Reserved: { cls: 'bg-warning text-dark', label: 'Dipesan' },
  ReturnedGood: { cls: 'bg-success', label: 'Kembali Baik' },
  ReturnedDamaged: { cls: 'bg-danger', label: 'Kembali Rusak' },
  ReturnedLost: { cls: 'bg-dark', label: 'Hilang' },
  Restored: { cls: 'bg-success', label: 'Diperbaiki' },
}

export function badgeClass(status: string): string {
  return `badge ${BADGES[status]?.cls ?? 'bg-secondary'}`
}

export function badgeLabel(status: string): string {
  return BADGES[status]?.label ?? status
}
