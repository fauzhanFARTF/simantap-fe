<script setup lang="ts">
/** Daftar peminjaman, dengan pencarian & filter status langsung di browser. */
import { computed, onMounted, ref } from 'vue'

import { loanApi } from '@/api'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Loan, LoanStatus, Paginated } from '@/types/models'
import { fmtDate } from '@/utils/format'

const STATUS_FILTERS: LoanStatus[] = [
  'Pending', 'Approved', 'CheckedOut', 'Returned', 'Completed', 'Rejected', 'Cancelled',
]

const auth = useAuthStore()

const { data, loading, run } = useAsync<Paginated<Loan>>(() => loanApi.list(), {
  results: [], count: 0, page: 1, pages: 1, page_size: 0,
})

const statusFilter = ref<LoanStatus | ''>('')
const loans = computed(() => data.value.results)

const { query, filtered } = useLiveFilter(loans, (loan) =>
  [loan.loan_code, loan.requester_name, loan.event_name, ...loan.asset_names].join(' '),
)

const visible = computed(() =>
  statusFilter.value ? filtered.value.filter((l) => l.status === statusFilter.value) : filtered.value,
)

const canCreate = computed(() => auth.hasRole('pemohon', 'inventory_staff', 'admin'))

async function remove(loan: Loan) {
  const confirmed = await confirmAction(
    `Hapus PERMANEN acara ${loan.loan_code} (${loan.event_name})? Alat yang terkait ` +
      'dikembalikan ke Tersedia. Tindakan ini TIDAK BISA dibatalkan.',
  )
  if (!confirmed) return
  if (await runAction(() => loanApi.remove(loan.uuid))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader title="Peminjaman" subtitle="Daftar pengajuan peminjaman alat streaming.">
    <template #actions>
      <RouterLink v-if="canCreate" to="/loans/create" class="btn btn-amber" data-testid="btn-new-loan">
        <i class="fa-solid fa-plus"></i> Ajukan Peminjaman
      </RouterLink>
      <ResetButton
        scope="loans"
        label="Reset Peminjaman"
        confirm="RESET SEMUA peminjaman/acara? Seluruh data peminjaman dihapus PERMANEN dan status alat yang dipinjam/dipesan dikembalikan ke Tersedia. Tindakan ini TIDAK BISA dibatalkan."
        @done="run"
      />
    </template>
  </PageHeader>

  <div class="card-sb">
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari kode, pemohon, acara, atau nama alat... (langsung tampil)"
          autocomplete="off"
          data-testid="search-input"
        />
      </div>
      <div class="col-md-6 d-flex flex-wrap gap-2 align-items-center">
        <button
          type="button"
          class="btn btn-sm"
          :class="statusFilter === '' ? 'btn-primary' : 'btn-outline-navy'"
          @click="statusFilter = ''"
        >
          Semua
        </button>
        <button
          v-for="status in STATUS_FILTERS"
          :key="status"
          type="button"
          class="btn btn-sm"
          :class="statusFilter === status ? 'btn-primary' : 'btn-outline-navy'"
          @click="statusFilter = status"
        >
          {{ status }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <EmptyState
      v-else-if="!loans.length"
      icon="fa-clipboard"
      title="Belum ada data"
      message="Pengajuan peminjaman akan muncul di sini."
    />

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="loans-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Pemohon</th>
            <th>Acara</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in visible" :key="loan.uuid">
            <td class="code">{{ loan.loan_code }}</td>
            <td>{{ loan.requester_name }}</td>
            <td>{{ loan.event_name }}</td>
            <td class="small">{{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}</td>
            <td><StatusBadge :status="loan.status" :label="loan.status_label" /></td>
            <td class="d-flex gap-1">
              <RouterLink
                :to="`/loans/${loan.uuid}`"
                class="btn btn-sm btn-outline-navy"
                :data-testid="`btn-view-loan-${loan.id}`"
              >
                <i class="fa-regular fa-eye"></i>
              </RouterLink>
              <button
                v-if="auth.isSuperadmin"
                type="button"
                class="btn btn-sm btn-outline-danger"
                title="Hapus acara (Super Admin)"
                :data-testid="`btn-delete-loan-${loan.id}`"
                @click="remove(loan)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td colspan="6" class="text-center text-slate py-4">
              Tidak ada peminjaman yang cocok dengan pencarian / filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
