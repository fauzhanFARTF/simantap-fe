<script setup lang="ts">
/** Paket Alat — bundling alat untuk skenario liputan yang umum. */
import { computed, onMounted, toRef } from 'vue'

import { packageApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Package, Paginated } from '@/types/models'

const auth = useAuthStore()

const { data, loading, run } = useAsync<Paginated<Package>>(() => packageApi.list(), {
  results: [], count: 0, page: 1, pages: 1, page_size: 0,
})
const packages = computed(() => data.value.results)

const { query, filtered } = useLiveFilter(toRef(packages, 'value'), (pkg) =>
  [pkg.name, pkg.description ?? ''].join(' '),
)

const canManage = computed(() => auth.hasRole('admin_gudang', 'admin'))

async function remove(pkg: Package) {
  if (!(await confirmAction('Hapus paket ini?'))) return
  if (await runAction(() => packageApi.remove(pkg.uuid))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader
    title="Paket Alat"
    subtitle="Bundling alat untuk skenario liputan yang umum, memudahkan pengajuan peminjaman."
  >
    <template #actions>
      <RouterLink
        v-if="canManage"
        to="/packages/create"
        class="btn btn-amber"
        data-testid="btn-new-package"
      >
        <i class="fa-solid fa-plus"></i> Tambah Paket
      </RouterLink>
      <ResetButton
        scope="packages"
        label="Reset Paket"
        confirm="RESET SEMUA paket alat? Seluruh paket dihapus PERMANEN. Tindakan ini TIDAK BISA dibatalkan."
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
          placeholder="Cari nama atau deskripsi paket... (langsung tampil)"
          data-testid="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="packages-table">
        <thead>
          <tr>
            <th>Nama Paket</th>
            <th>Deskripsi</th>
            <th>Jumlah Alat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in filtered" :key="pkg.uuid">
            <td><strong>{{ pkg.name }}</strong></td>
            <td class="small text-slate">{{ pkg.description || '—' }}</td>
            <td><span class="badge bg-info text-dark">{{ pkg.item_count }} alat</span></td>
            <td class="text-nowrap">
              <template v-if="canManage">
                <RouterLink
                  :to="`/packages/${pkg.uuid}/edit`"
                  class="btn btn-sm btn-outline-navy"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </RouterLink>
                <button class="btn btn-sm btn-outline-danger ms-1" @click="remove(pkg)">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </template>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="4" class="text-center text-slate py-4">
              {{ packages.length ? 'Tidak ada paket yang cocok dengan pencarian.' : 'Belum ada paket.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
