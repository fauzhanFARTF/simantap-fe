<script setup lang="ts">
/** Dashboard — ringkasan yang menyesuaikan peran pengguna. */
import { computed, onMounted } from 'vue'

import { dashboardApi } from '@/api'
import EmptyState from '@/components/common/EmptyState.vue'
import HintBox from '@/components/common/HintBox.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BorrowedItemsCard from '@/components/loans/BorrowedItemsCard.vue'
import LoanScheduleCard from '@/components/dashboard/LoanScheduleCard.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import { useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { DashboardPayload } from '@/types/models'
import { fmtDate, fmtTime } from '@/utils/format'

const auth = useAuthStore()

const EMPTY: DashboardPayload = {
  stats: {
    total_assets: 0, available: 0, checked_out: 0, damaged: 0,
    pending_approvals: 0, active_loans: 0, items_pending: 0,
    items_approved: 0, opd_out: 0, opd_consumable: 0,
  },
  asset_breakdown: [],
  my_loans: [],
  recent_damage: [],
  schedule_loans: [],
  past_loans: [],
  show_schedule: false,
  opd_out: [],
  borrowed_items: [],
}

const { data, loading, run } = useAsync(() => dashboardApi.fetch(), EMPTY)

const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
const canCreateLoan = computed(() => auth.hasRole('pemohon', 'inventory_staff', 'admin'))
const isRequester = computed(() => auth.hasRole('pemohon', 'inventory_staff'))
const showOpdCards = computed(() => !auth.isPersonalBorrower)

onMounted(run)
</script>

<template>
  <HintBox v-if="isRequester" class="no-print">
    Butuh alat untuk kegiatan? Klik <strong>"Ajukan Peminjaman"</strong> di kanan atas, isi
    formulir singkat, lalu tunggu persetujuan dari supervisor. Anda akan mendapat notifikasi
    begitu disetujui.
  </HintBox>

  <div class="page-header">
    <div>
      <h1>Selamat datang, {{ firstName }} 👋</h1>
      <p class="subtitle">Ringkasan aset streaming &amp; aktivitas peminjaman.</p>
    </div>
    <RouterLink
      v-if="canCreateLoan"
      to="/loans/create"
      class="btn btn-amber"
      data-testid="btn-create-loan"
    >
      <i class="fa-solid fa-plus"></i> Ajukan Peminjaman
    </RouterLink>
  </div>

  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat ringkasan…</div>

  <template v-else>
    <div class="row g-3 mb-4" data-testid="stat-cards">
      <div class="col-6 col-md-3">
        <StatCard
          tone="navy"
          icon="fa-boxes-stacked"
          label="Total Aset"
          :value="data.stats.total_assets"
          hint="Alat aktif (non-retired)"
          testid="stat-total"
        />
      </div>
      <div class="col-6 col-md-3">
        <StatCard
          tone="success"
          icon="fa-circle-check"
          label="Tersedia"
          :value="data.stats.available"
          hint="Siap dipinjam"
          testid="stat-available"
        >
          <div
            v-if="data.asset_breakdown.length"
            class="text-slate small"
            style="margin-top: 2px; opacity: 0.85"
            title="Alat yang tidak terhitung Tersedia"
            data-testid="stat-available-breakdown"
          >
            <i class="fa-solid fa-circle-info me-1"></i>{{ data.asset_breakdown.join(' · ') }}
          </div>
        </StatCard>
      </div>
      <div class="col-6 col-md-3">
        <StatCard
          tone="info"
          icon="fa-arrow-right-from-bracket"
          label="Sedang Dipinjam"
          :value="data.stats.checked_out"
          hint="Di lapangan / studio"
          testid="stat-checkedout"
        />
      </div>
      <div class="col-6 col-md-3">
        <StatCard
          tone="danger"
          icon="fa-triangle-exclamation"
          label="Dalam Perbaikan"
          :value="data.stats.damaged"
          hint="Menunggu teknisi"
          testid="stat-damaged"
        />
      </div>
      <div class="col-6 col-md-3">
        <StatCard
          tone="navy"
          icon="fa-hourglass-half"
          label="Barang Menunggu Approval"
          :value="data.stats.items_pending"
          hint="Pada peminjaman berstatus Pending"
          testid="stat-items-pending"
        />
      </div>
      <div class="col-6 col-md-3">
        <StatCard
          tone="success"
          icon="fa-clipboard-check"
          label="Barang Disetujui"
          :value="data.stats.items_approved"
          hint="Siap diserahkan"
          testid="stat-items-approved"
        />
      </div>
      <template v-if="showOpdCards">
        <div class="col-6 col-md-3">
          <RouterLink to="/opd-items" class="text-decoration-none" data-testid="link-opd-out">
            <StatCard
              tone="info"
              icon="fa-building-columns"
              label="Barang Keluar untuk OPD"
              :value="data.stats.opd_out"
              hint="Akan dikembalikan — ditunggu kembali"
              testid="stat-opd-out"
            />
          </RouterLink>
        </div>
        <div class="col-6 col-md-3">
          <RouterLink
            to="/opd-items"
            class="text-decoration-none"
            data-testid="link-opd-consumable"
          >
            <StatCard
              tone="navy"
              icon="fa-building-columns"
              label="Barang Tetap di OPD"
              :value="data.stats.opd_consumable"
              hint="Menunggu — kembali bila rusak"
              testid="stat-opd-consumable"
            />
          </RouterLink>
        </div>
      </template>
    </div>

    <div class="row g-3">
      <div class="col-lg-7">
        <div class="card-sb">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="card-title mb-0">
              <i class="fa-solid fa-clock-rotate-left me-2 text-slate"></i>
              Peminjaman Terbaru{{ isRequester ? ' Anda' : '' }}
            </div>
            <RouterLink to="/loans" class="btn btn-sm btn-outline-navy">Lihat semua</RouterLink>
          </div>

          <EmptyState
            v-if="!data.my_loans.length"
            icon="fa-clipboard"
            title="Belum ada peminjaman"
            message="Riwayat peminjaman Anda akan muncul di sini."
          >
            <RouterLink v-if="canCreateLoan" to="/loans/create" class="btn btn-sm btn-amber">
              <i class="fa-solid fa-plus"></i> Ajukan Sekarang
            </RouterLink>
          </EmptyState>

          <div v-else class="table-responsive">
            <table class="table table-sb align-middle" data-testid="table-my-loans">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Acara</th>
                  <th>Peminjam</th>
                  <th>Status</th>
                  <th v-if="auth.hasRole('admin_gudang')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="loan in data.my_loans" :key="loan.uuid">
                  <td class="code">
                    <RouterLink :to="`/loans/${loan.uuid}`">{{ loan.loan_code }}</RouterLink>
                    <!-- Hanya bermakna di dashboard pemohon/IT Staff, yang daftarnya
                         memuat peminjaman sendiri DAN yang melibatkan dirinya. -->
                    <div v-if="isRequester" class="mt-1">
                      <span v-if="loan.is_mine" class="badge bg-secondary" style="font-weight: 600">
                        Diajukan Anda
                      </span>
                      <span
                        v-else
                        class="badge bg-info text-dark"
                        style="font-weight: 600"
                        :data-testid="`badge-terlibat-${loan.id}`"
                      >
                        Anda terlibat
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ loan.event_name }}</div>
                    <div v-if="loan.event_location" class="text-slate small">
                      <i class="fa-solid fa-location-dot me-1"></i>{{ loan.event_location }}
                    </div>
                    <div class="text-slate small">
                      <i class="fa-regular fa-calendar me-1"></i>
                      {{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}
                    </div>
                    <div v-if="loan.start_time" class="text-slate small">
                      <i class="fa-regular fa-clock me-1"></i>{{ fmtTime(loan.start_time) }}
                    </div>
                  </td>
                  <td>
                    <div class="fw-semibold small">{{ loan.requester_name }}</div>
                    <div v-if="loan.participants.length" class="text-slate small">
                      <i class="fa-solid fa-users me-1"></i>{{ loan.participants.join(', ') }}
                    </div>
                  </td>
                  <td><StatusBadge :status="loan.status" :label="loan.status_label" /></td>
                  <td v-if="auth.hasRole('admin_gudang')" class="text-nowrap">
                    <a
                      :href="`/loans/${loan.uuid}/berita-acara`"
                      target="_blank"
                      class="btn btn-sm btn-outline-navy"
                      title="Cetak Berita Acara Keluar"
                      :data-testid="`btn-berita-${loan.id}`"
                    >
                      <i class="fa-solid fa-file-lines"></i> Berita Acara
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-5">
        <template v-if="data.show_schedule">
          <LoanScheduleCard
            icon="fa-calendar-day"
            title="Jadwal Hari Ini & Selanjutnya"
            :loans="data.schedule_loans"
            empty-text="Tidak ada jadwal acara hari ini maupun mendatang."
          />
          <LoanScheduleCard
            class="mt-3"
            icon="fa-calendar-check"
            title="Jadwal yang Telah Lewat"
            :loans="data.past_loans"
            empty-text="Belum ada jadwal acara yang telah lewat."
          />
        </template>

        <div
          v-if="data.opd_out.length"
          class="card-sb"
          :class="{ 'mt-3': data.show_schedule }"
          data-testid="card-opd-out"
        >
          <div class="card-title mb-2">
            <i class="fa-solid fa-building-columns me-2 text-slate"></i>Barang Keluar ke OPD
          </div>
          <div class="text-slate small mb-2" style="margin-top: -4px">
            Barang yang masih ditunggu kembali dari OPD. Barang yang tetap di OPD ada di menu
            <RouterLink to="/opd-items">Barang di OPD</RouterLink>.
          </div>
          <div
            v-for="loan in data.opd_out"
            :key="loan.uuid"
            class="d-flex align-items-start justify-content-between py-2 border-bottom gap-2"
          >
            <div class="min-w-0">
              <div class="small text-mono">
                <RouterLink :to="`/loans/${loan.uuid}`">{{ loan.loan_code }}</RouterLink>
              </div>
              <div class="fw-semibold small">{{ loan.event_name }}</div>
              <div class="text-slate small">
                <i class="fa-solid fa-boxes-stacked me-1"></i>{{ loan.pending_return ?? 0 }} alat
                ditunggu kembali<template v-if="loan.checkout_at">
                  · keluar {{ fmtDate(loan.checkout_at) }}</template
                >
              </div>
              <div class="text-slate small">
                <i class="fa-solid fa-user me-1"></i>{{ loan.requester_name }}
              </div>
            </div>
            <span class="badge bg-info text-dark">Di OPD</span>
          </div>
        </div>

        <div :class="{ 'mt-3': data.show_schedule || data.opd_out.length }">
          <BorrowedItemsCard :items="data.borrowed_items" />
        </div>

        <div class="card-sb mt-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="card-title mb-0">
              <i class="fa-solid fa-screwdriver-wrench me-2 text-slate"></i>Perbaikan Aktif
            </div>
            <RouterLink
              v-if="auth.hasRole('admin_gudang', 'admin')"
              to="/repairs"
              class="btn btn-sm btn-outline-navy"
            >
              Kelola
            </RouterLink>
          </div>
          <div v-if="!data.recent_damage.length" class="text-slate small">
            Tidak ada alat dalam perbaikan.
          </div>
          <div
            v-for="repair in data.recent_damage"
            :key="repair.uuid"
            class="d-flex align-items-start justify-content-between py-2 border-bottom"
          >
            <div>
              <div class="fw-semibold small">{{ repair.asset_name }}</div>
              <div class="text-slate small text-mono">{{ repair.bmn_number }}</div>
            </div>
            <StatusBadge :status="repair.status" :label="repair.status_label" />
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
