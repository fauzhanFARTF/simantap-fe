<script setup lang="ts">
/**
 * Kartu "Alat yang Masih Dipinjam" — dipakai di dashboard maupun di halaman
 * pindai admin gudang, supaya tanggungan seseorang terlihat sebelum alat baru
 * diserahkan kepadanya.
 */
import type { BorrowedItem } from '@/types/models'
import { fmtDate } from '@/utils/format'

withDefaults(
  defineProps<{
    items: BorrowedItem[]
    title?: string
    subtitle?: string
    emptyText?: string
  }>(),
  {
    title: 'Alat yang Masih Dipinjam',
    subtitle:
      'Alat yang sudah keluar gudang dan belum dikembalikan, beserta penanggung jawab dan personel yang dilibatkan.',
    emptyText: 'Tidak ada alat yang sedang dipinjam.',
  },
)

/**
 * Tanggal kembali yang ditampilkan. Peminjaman OPD tanpa tanggal dipatok ke
 * 2099 sebagai penanda "tanpa batas waktu" — jangan tampilkan tanggal palsu itu.
 */
function dueDate(item: BorrowedItem): string | null {
  const due = item.expected_return_date ?? (item.loan_type === 'event' ? item.end_date : null)
  return due && due < '2099-01-01' ? due : null
}
</script>

<template>
  <div class="card-sb" data-testid="borrowed-items-card">
    <div class="card-title mb-1">
      <i class="fa-solid fa-people-carry-box me-2 text-slate"></i>{{ title }}
      <span v-if="items.length" class="badge bg-primary align-middle">{{ items.length }}</span>
    </div>
    <div class="text-slate small mb-2" style="margin-top: -4px">{{ subtitle }}</div>

    <div v-if="!items.length" class="text-slate small py-2">{{ emptyText }}</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle mb-0" data-testid="borrowed-items-table">
        <thead>
          <tr>
            <th>Alat</th>
            <th>Penanggung Jawab</th>
            <th>Personel Terlibat</th>
            <th>Keperluan</th>
            <th>Keluar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <div class="fw-semibold small">{{ item.asset_name }}</div>
              <div class="text-slate small text-mono">{{ item.asset_code }}</div>
            </td>
            <td class="small">
              <i class="fa-solid fa-user me-1 text-slate"></i>{{ item.requester_name }}
            </td>
            <td class="small">
              <template v-if="item.personnel.length">
                <i class="fa-solid fa-users me-1 text-slate"></i>{{ item.personnel.join(', ') }}
              </template>
              <span v-else class="text-slate">—</span>
            </td>
            <td class="small">
              <RouterLink :to="`/loans/${item.loan_uuid}`" class="text-decoration-none">
                {{ item.event_name }}
              </RouterLink>
              <div class="text-slate text-mono" style="font-size: 11px">
                {{ item.loan_code }}{{ item.loan_type === 'opd' ? ' · Kebutuhan Jaringan' : '' }}
              </div>
            </td>
            <td class="small">
              <template v-if="item.checkout_at">{{ fmtDate(item.checkout_at) }}</template>
              <span v-else class="text-slate">—</span>
              <div v-if="dueDate(item)" class="text-slate" style="font-size: 11px">
                kembali {{ fmtDate(dueDate(item)) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
