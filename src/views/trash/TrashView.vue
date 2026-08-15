<script setup lang="ts">
/**
 * Riwayat Terhapus — dua tabel terpisah: yang masih terhapus, dan yang pernah
 * dipulihkan. Keduanya ditampilkan bersamaan (bukan tab) supaya jejak
 * "siapa menghapus & siapa memulihkan" terbaca sekaligus.
 */
import { computed, onMounted } from 'vue'

import { trashApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import type { TrashRow } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const { data, loading, run } = useAsync(() => trashApi.list(), {
  deleted: [] as TrashRow[],
  restored: [] as TrashRow[],
})

const deleted = computed(() => data.value.deleted)
const restored = computed(() => data.value.restored)

async function restore(row: TrashRow) {
  if (!(await confirmAction('Pulihkan data ini?'))) return
  if (await runAction(() => trashApi.restore(row.type, row.id))) await run()
}

async function purge(row: TrashRow) {
  const confirmed = await confirmAction(
    `HAPUS PERMANEN "${row.label}"? Tindakan ini TIDAK BISA dibatalkan dan data akan hilang ` +
      'selamanya dari database.',
  )
  if (!confirmed) return
  if (await runAction(() => trashApi.purge(row.type, row.id))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader
    title="Riwayat Terhapus"
    subtitle="Data yang sudah dihapus (soft delete) dari seluruh modul — masih bisa dipulihkan kapan saja."
  />

  <div class="card-sb">
    <div class="card-title">Data Terhapus</div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="trash-table">
        <thead>
          <tr>
            <th>Jenis Data</th>
            <th>Nama / Kode</th>
            <th>Dihapus oleh</th>
            <th>Tanggal Dihapus</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in deleted"
            :key="`${row.type}-${row.id}`"
            :data-testid="`trash-row-${row.type}-${row.id}`"
          >
            <td><span class="badge bg-secondary">{{ row.type_label }}</span></td>
            <td><strong>{{ row.label }}</strong></td>
            <td class="small text-slate">{{ row.deleted_by_name || '—' }}</td>
            <td class="small text-mono">{{ fmtDateTime(row.deleted_at) }}</td>
            <td class="text-nowrap">
              <div class="d-flex gap-2">
                <button
                  class="btn btn-sm btn-outline-navy"
                  :data-testid="`btn-restore-${row.type}-${row.id}`"
                  @click="restore(row)"
                >
                  <i class="fa-solid fa-rotate-left"></i> Pulihkan
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  :data-testid="`btn-purge-${row.type}-${row.id}`"
                  @click="purge(row)"
                >
                  <i class="fa-solid fa-trash-can"></i> Hapus Permanen
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!deleted.length">
            <td colspan="5" class="text-center text-slate py-4">Belum ada data yang dihapus.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card-sb mt-3">
    <div class="card-title">Riwayat Pemulihan</div>
    <p class="text-slate small">
      Data yang pernah dihapus lalu dipulihkan kembali — supaya tetap terlihat siapa yang menghapus
      dan siapa yang memulihkannya.
    </p>
    <div class="table-responsive">
      <table class="table table-sb align-middle" data-testid="restored-table">
        <thead>
          <tr>
            <th>Jenis Data</th>
            <th>Nama / Kode</th>
            <th>Dihapus oleh</th>
            <th>Dipulihkan oleh</th>
            <th>Tanggal Dipulihkan</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in restored"
            :key="`${row.type}-${row.id}`"
            :data-testid="`restored-row-${row.type}-${row.id}`"
          >
            <td><span class="badge bg-secondary">{{ row.type_label }}</span></td>
            <td><strong>{{ row.label }}</strong></td>
            <td class="small text-slate">{{ row.deleted_by_name || '—' }}</td>
            <td class="small text-slate">{{ row.restored_by_name || '—' }}</td>
            <td class="small text-mono">{{ fmtDateTime(row.restored_at) }}</td>
          </tr>
          <tr v-if="!restored.length">
            <td colspan="5" class="text-center text-slate py-4">
              Belum ada data yang pernah dipulihkan.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
