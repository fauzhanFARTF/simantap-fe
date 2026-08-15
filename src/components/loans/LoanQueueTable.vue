<script setup lang="ts">
/**
 * Antrean gudang — dipakai halaman Penyerahan dan Pengembalian.
 *
 * Keduanya menampilkan tabel yang sama persis; yang berbeda hanya tujuan
 * tombol Scan dan kalimat saat kosong, jadi keduanya jadi prop.
 */
import { computed, toRef } from 'vue'

import StatusBadge from '@/components/common/StatusBadge.vue'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Loan } from '@/types/models'
import { fmtDate } from '@/utils/format'

const props = defineProps<{
  loans: Loan[]
  loading: boolean
  /** Awalan rute tombol Scan: 'checkout' atau 'checkin'. */
  scanBase: 'checkout' | 'checkin'
  emptyText: string
  testid: string
  scanTestidPrefix: string
}>()

const auth = useAuthStore()

const { query, filtered } = useLiveFilter(toRef(props, 'loans'), (loan) =>
  [loan.loan_code, loan.requester_name, loan.event_name].join(' '),
)

const canScan = computed(() => auth.hasRole('admin_gudang', 'admin'))
</script>

<template>
  <div class="card-sb">
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari kode, pemohon, atau acara... (langsung tampil)"
          data-testid="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" :data-testid="testid">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Pemohon</th>
            <th>Acara</th>
            <th>Rentang</th>
            <th>Progress</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in filtered" :key="loan.uuid">
            <td class="code">{{ loan.loan_code }}</td>
            <td>{{ loan.requester_name }}</td>
            <td>{{ loan.event_name }}</td>
            <td class="small">{{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}</td>
            <td class="small">
              <span class="fw-bold">{{ loan.progress_done ?? 0 }}</span> / {{ loan.item_count }}
              alat
            </td>
            <td><StatusBadge :status="loan.status" :label="loan.status_label" /></td>
            <td>
              <RouterLink
                v-if="canScan"
                :to="`/${scanBase}/${loan.uuid}`"
                class="btn btn-sm btn-amber"
                :data-testid="`${scanTestidPrefix}${loan.id}`"
              >
                <i class="fa-solid fa-barcode"></i> Scan
              </RouterLink>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="text-center text-slate py-4">
              {{ loans.length ? 'Tidak ada peminjaman yang cocok dengan pencarian.' : emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
