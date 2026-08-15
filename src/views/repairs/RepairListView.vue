<script setup lang="ts">
/** Perbaikan Alat — tiket aktif dan 20 riwayat selesai terakhir. */
import { computed, onMounted, toRef } from 'vue'

import { repairApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import type { Repair } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const { data, loading, run } = useAsync(() => repairApi.list(), {
  active: [] as Repair[],
  done: [] as Repair[],
})

const active = computed(() => data.value.active)
const done = computed(() => data.value.done)

const { query: activeQuery, filtered: activeRows } = useLiveFilter(
  toRef(active, 'value'),
  (repair) =>
    [repair.repair_code, repair.asset_name, repair.asset_code, repair.bmn_number,
     repair.complaint, repair.status].join(' '),
)
const { query: doneQuery, filtered: doneRows } = useLiveFilter(toRef(done, 'value'), (repair) =>
  [repair.repair_code, repair.asset_name, repair.technician_name ?? '',
   repair.completed_by_name ?? ''].join(' '),
)

/** Potong keluhan panjang agar tabel tidak melebar tak terkendali. */
const truncate = (text: string, limit = 60) =>
  text.length > limit ? `${text.slice(0, limit)}…` : text

onMounted(run)
</script>

<template>
  <PageHeader
    title="Perbaikan Alat"
    subtitle="Alat rusak yang sedang / telah ditangani teknisi berdasarkan Formulir Perbaikan (SPK) fisik."
  >
    <template #actions>
      <ResetButton
        scope="repairs"
        label="Reset Perbaikan"
        confirm="RESET SEMUA catatan perbaikan? Seluruh riwayat perbaikan dihapus PERMANEN. Tindakan ini TIDAK BISA dibatalkan."
        @done="run"
      />
    </template>
  </PageHeader>

  <div class="card-sb">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
      <div class="card-title mb-0">Perbaikan Aktif ({{ active.length }})</div>
      <div style="max-width: 320px; width: 100%">
        <input
          v-model="activeQuery"
          type="search"
          class="form-control form-control-sm"
          placeholder="Cari kode, alat, BMN, atau keluhan... (langsung tampil)"
          autocomplete="off"
          data-testid="search-input-active"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="repairs-active">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Alat</th>
            <th>BMN</th>
            <th>Keluhan</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="repair in activeRows" :key="repair.uuid">
            <td class="code">{{ repair.repair_code }}</td>
            <td>
              {{ repair.asset_name }}<br />
              <span class="small text-slate text-mono">{{ repair.asset_code }}</span>
            </td>
            <td class="text-mono small">{{ repair.bmn_number }}</td>
            <td class="small">{{ truncate(repair.complaint) }}</td>
            <td><StatusBadge :status="repair.status" :label="repair.status_label" /></td>
            <td class="small text-slate">{{ fmtDateTime(repair.created_at) }}</td>
            <td class="text-nowrap">
              <RouterLink
                :to="`/repairs/${repair.uuid}`"
                class="btn btn-sm btn-outline-navy"
                :data-testid="`btn-view-repair-${repair.id}`"
              >
                <i class="fa-regular fa-eye"></i>
              </RouterLink>
              <a
                :href="`/repairs/${repair.uuid}/print`"
                target="_blank"
                class="btn btn-sm btn-amber ms-1"
                :data-testid="`btn-print-repair-${repair.id}`"
              >
                <i class="fa-solid fa-print"></i> SPK
              </a>
            </td>
          </tr>
          <tr v-if="!activeRows.length">
            <td colspan="7" class="text-center text-slate py-4">
              {{
                active.length
                  ? 'Tidak ada perbaikan aktif yang cocok dengan pencarian.'
                  : 'Tidak ada alat dalam perbaikan.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card-sb mt-3">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
      <div class="card-title mb-0">Perbaikan Selesai (20 terakhir)</div>
      <div style="max-width: 320px; width: 100%">
        <input
          v-model="doneQuery"
          type="search"
          class="form-control form-control-sm"
          placeholder="Cari kode, alat, atau teknisi... (langsung tampil)"
          autocomplete="off"
          data-testid="search-input-done"
        />
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-sb align-middle">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Alat</th>
            <th>Teknisi</th>
            <th>Selesai</th>
            <th>Ditutup Oleh</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="repair in doneRows" :key="repair.uuid">
            <td class="code">
              <RouterLink :to="`/repairs/${repair.uuid}`">{{ repair.repair_code }}</RouterLink>
            </td>
            <td>{{ repair.asset_name }}</td>
            <td class="small">{{ repair.technician_name }}</td>
            <td class="small text-slate">{{ fmtDateTime(repair.completed_at) }}</td>
            <td class="small">{{ repair.completed_by_name }}</td>
            <td></td>
          </tr>
          <tr v-if="!doneRows.length">
            <td colspan="6" class="text-center text-slate py-4">
              {{
                done.length
                  ? 'Tidak ada riwayat perbaikan yang cocok dengan pencarian.'
                  : 'Belum ada riwayat perbaikan.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
