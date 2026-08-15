<script setup lang="ts">
/**
 * Log notifikasi lintas-user — khusus admin & pimpinan.
 *
 * Berbeda dari kotak masuk pribadi: di sini terlihat notifikasi ke SEMUA user,
 * supaya bisa dipastikan sebuah kejadian benar-benar terkirim.
 */
import { computed, onMounted, ref, toRef } from 'vue'

import { notificationApi } from '@/api'
import HintBox from '@/components/common/HintBox.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import type { NotificationLogRow, Role } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const ROLE_FILTERS: { value: Role; label: string }[] = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrator' },
  { value: 'supervisor', label: 'Staff Approval' },
  { value: 'admin_gudang', label: 'Admin Gudang' },
  { value: 'inventory_staff', label: 'IT Staff' },
  { value: 'it_staff_pembantu', label: 'IT Staff Pembantu' },
  { value: 'administrator_pembantu_manajemen_user', label: 'Administrator Pembantu — Manajemen User' },
  { value: 'administrator_pembantu_manajemen_alat', label: 'Administrator Pembantu — Manajemen Alat' },
  { value: 'administrator_pembantu_manajemen_kategori', label: 'Administrator Pembantu — Manajemen Kategori' },
  { value: 'pimpinan', label: 'Pimpinan' },
  { value: 'pemohon', label: 'Personel Luar' },
]

const { data, loading, run } = useAsync(() => notificationApi.log(), {
  results: [] as NotificationLogRow[],
})
const rows = computed(() => data.value.results)

const roleFilter = ref('')
const channelFilter = ref('')

const { query, filtered } = useLiveFilter(toRef(rows, 'value'), (row) =>
  [row.title, row.body ?? '', row.user_name].join(' '),
)

const visible = computed(() =>
  filtered.value.filter(
    (row) =>
      (!roleFilter.value || row.user_role === roleFilter.value) &&
      (!channelFilter.value ||
        String(Number(row.telegram_attempted)) === channelFilter.value),
  ),
)

/** Isi notifikasi bisa panjang; dipotong agar kolomnya tidak mendominasi tabel. */
const truncate = (text: string, limit = 140) =>
  text.length > limit ? `${text.slice(0, limit)}…` : text

onMounted(run)
</script>

<template>
  <PageHeader
    title="Log Notifikasi"
    subtitle="Seluruh notifikasi yang terkirim ke semua user — Staff Approval, Admin Gudang, Personel Luar (peminjaman), dsb — baik ke Kotak Masuk web maupun Telegram."
  />

  <div class="card-sb">
    <HintBox>
      Kolom <strong>Kanal</strong> menandakan Telegram bila Chat ID penerima sudah terisi saat
      notifikasi dibuat (kanal itu dicoba dikirim) — bukan konfirmasi bahwa Telegram-nya berhasil
      diterima. Menampilkan 300 notifikasi terbaru.
    </HintBox>

    <div class="row g-2 mb-3">
      <div class="col-md-5">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari judul, isi, atau nama penerima... (langsung tampil)"
          autocomplete="off"
          data-testid="search-input"
        />
      </div>
      <div class="col-md-4">
        <select v-model="roleFilter" class="form-select" data-testid="filter-role">
          <option value="">— Semua Role Penerima —</option>
          <option v-for="role in ROLE_FILTERS" :key="role.value" :value="role.value">
            {{ role.label }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <select v-model="channelFilter" class="form-select" data-testid="filter-telegram">
          <option value="">— Semua Kanal —</option>
          <option value="1">Web + Telegram</option>
          <option value="0">Web saja</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-5">Memuat log…</div>

    <div v-else-if="!rows.length" class="text-center text-slate py-5">
      <i class="fa-regular fa-bell-slash" style="font-size: 36px"></i>
      <div class="mt-2">Belum ada notifikasi.</div>
    </div>

    <template v-else>
      <div class="table-responsive">
        <table class="table table-sb align-middle" data-testid="notif-log-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Penerima</th>
              <th>Judul</th>
              <th>Isi</th>
              <th>Kanal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visible" :key="row.id" :data-testid="`notif-log-${row.id}`">
              <td class="text-slate small text-nowrap">{{ fmtDateTime(row.created_at) }}</td>
              <td>
                <div class="fw-semibold">{{ row.user_name }}</div>
                <div class="text-slate small">{{ row.user_role_label }}</div>
              </td>
              <td>{{ row.title }}</td>
              <td class="small text-slate" style="max-width: 320px">
                {{ truncate(row.body ?? '') }}
              </td>
              <td>
                <span class="badge bg-secondary">Web</span>
                <span v-if="row.telegram_attempted" class="badge bg-info text-dark ms-1">
                  Telegram
                </span>
              </td>
              <td>
                <span v-if="row.is_read" class="text-slate small">Dibaca</span>
                <span v-else class="badge bg-warning text-dark">Belum dibaca</span>
              </td>
              <td>
                <RouterLink v-if="row.link" :to="row.link" class="btn btn-sm btn-outline-navy">
                  Buka
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!visible.length" class="text-center text-slate py-4">
        Tidak ada notifikasi yang cocok dengan filter.
      </div>
    </template>
  </div>
</template>
