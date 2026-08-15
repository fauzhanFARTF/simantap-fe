<script setup lang="ts">
/** Halaman approval: pengajuan yang menunggu + riwayat keputusan terakhir. */
import { computed, onMounted } from 'vue'

import { loanApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import type { Loan } from '@/types/models'
import { fmtDate, fmtDateTime } from '@/utils/format'

const { data, loading, run } = useAsync(() => loanApi.approvals(), {
  pending: [] as Loan[],
  decided: [] as Loan[],
})

const pending = computed(() => data.value.pending)
const decided = computed(() => data.value.decided)

const { query: pendingQuery, filtered: pendingRows } = useLiveFilter(pending, (loan) =>
  [loan.loan_code, loan.requester_name, loan.requester_unit ?? '', loan.event_name].join(' '),
)
// Dua kotak pencarian terpisah, masing-masing menyaring tabelnya sendiri.
const { query: decidedQuery, filtered: decidedRows } = useLiveFilter(decided, (loan) =>
  [loan.loan_code, loan.requester_name, loan.event_name].join(' '),
)

onMounted(run)
</script>

<template>
  <PageHeader
    title="Approval Peminjaman"
    subtitle="Tinjau dan berikan keputusan atas pengajuan peminjaman alat."
  />

  <div class="card-sb">
    <div class="card-title">Menunggu Persetujuan ({{ pending.length }})</div>
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <input
          v-model="pendingQuery"
          type="search"
          class="form-control"
          placeholder="Cari kode, pemohon, atau acara... (langsung tampil)"
          data-testid="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="pending-approvals-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Pemohon</th>
            <th>Acara</th>
            <th>Tanggal</th>
            <th>Diajukan</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in pendingRows" :key="loan.uuid">
            <td class="code">{{ loan.loan_code }}</td>
            <td>
              {{ loan.requester_name }}<br />
              <span class="text-slate small">{{ loan.requester_unit }}</span>
            </td>
            <td>{{ loan.event_name }}</td>
            <td class="small">{{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}</td>
            <td class="small text-slate">{{ fmtDateTime(loan.created_at) }}</td>
            <td>
              <RouterLink
                :to="`/loans/${loan.uuid}`"
                class="btn btn-sm btn-primary"
                :data-testid="`btn-review-${loan.id}`"
              >
                Tinjau
              </RouterLink>
            </td>
          </tr>
          <tr v-if="!pendingRows.length">
            <td colspan="6" class="text-center text-slate py-4">
              {{ pending.length ? 'Tidak ada pengajuan yang cocok dengan pencarian.' : 'Tidak ada pengajuan menunggu.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card-sb mt-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="card-title mb-0">Riwayat Keputusan Terakhir</div>
      <div style="max-width: 320px; width: 100%">
        <input
          v-model="decidedQuery"
          type="search"
          class="form-control form-control-sm"
          placeholder="Cari kode, pemohon, atau acara..."
        />
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-sb align-middle">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Pemohon</th>
            <th>Acara</th>
            <th>Status</th>
            <th>Diputuskan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in decidedRows" :key="loan.uuid">
            <td class="code">
              <RouterLink :to="`/loans/${loan.uuid}`">{{ loan.loan_code }}</RouterLink>
            </td>
            <td>{{ loan.requester_name }}</td>
            <td>{{ loan.event_name }}</td>
            <td><StatusBadge :status="loan.status" :label="loan.status_label" /></td>
            <td class="small text-slate">
              {{ fmtDateTime(loan.approved_at) }} · {{ loan.supervisor_name ?? '—' }}
            </td>
          </tr>
          <tr v-if="!decidedRows.length">
            <td colspan="5" class="text-center text-slate py-4">
              Tidak ada riwayat yang cocok dengan pencarian.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
