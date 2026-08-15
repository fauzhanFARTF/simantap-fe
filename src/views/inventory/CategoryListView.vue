<script setup lang="ts">
/** Kategori alat — dasar penomoran otomatis Kode Aset. */
import { computed, onMounted, toRef } from 'vue'

import { categoryApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Category, Paginated } from '@/types/models'

const auth = useAuthStore()

const { data, loading, run } = useAsync<Paginated<Category>>(() => categoryApi.list(), {
  results: [], count: 0, page: 1, pages: 1, page_size: 0,
})
const categories = computed(() => data.value.results)

const { query, filtered } = useLiveFilter(toRef(categories, 'value'), (category) =>
  [category.name, category.description ?? '', category.code_prefix ?? ''].join(' '),
)

const canManage = computed(() =>
  auth.hasRole('admin', 'admin_gudang', 'administrator_pembantu_manajemen_kategori'),
)

async function remove(category: Category) {
  const confirmed = await confirmAction(
    `Hapus kategori "${category.name}"? (masih bisa dipulihkan lewat Riwayat Terhapus)`,
  )
  if (!confirmed) return
  if (await runAction(() => categoryApi.remove(category.uuid))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader
    title="Kategori Alat"
    :subtitle="`Grouping alat berdasarkan jenis untuk memudahkan pencarian — total ${categories.length} kategori.`"
  >
    <template #actions>
      <RouterLink
        v-if="canManage"
        to="/categories/create"
        class="btn btn-amber"
        data-testid="btn-new-category"
      >
        <i class="fa-solid fa-plus"></i> Tambah Kategori
      </RouterLink>
      <ResetButton
        scope="categories"
        label="Reset Kategori"
        confirm="RESET SEMUA kategori? Seluruh kategori dihapus PERMANEN (alat menjadi tanpa kategori). Tindakan ini TIDAK BISA dibatalkan."
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
          placeholder="Cari nama atau deskripsi kategori... (langsung tampil)"
          data-testid="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="categories-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Kode</th>
            <th>Deskripsi</th>
            <th>Jumlah Alat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="category in filtered"
            :key="category.uuid"
            :data-testid="`category-row-${category.id}`"
          >
            <td>
              <strong>{{ category.name }}</strong>
              <AuditTrailInfo :record="category" />
            </td>
            <td class="text-mono small">{{ category.code_prefix || '—' }}</td>
            <td class="small text-slate">{{ category.description || '—' }}</td>
            <td><span class="badge bg-info text-dark">{{ category.asset_count }}</span></td>
            <td class="text-nowrap">
              <template v-if="canManage">
                <RouterLink
                  :to="`/categories/${category.uuid}/edit`"
                  class="btn btn-sm btn-outline-navy"
                  :data-testid="`btn-edit-category-${category.id}`"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </RouterLink>
                <button
                  class="btn btn-sm btn-outline-danger ms-1"
                  :data-testid="`btn-delete-category-${category.id}`"
                  @click="remove(category)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </template>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="5" class="text-center text-slate py-4">
              {{
                categories.length
                  ? 'Tidak ada kategori yang cocok dengan pencarian.'
                  : 'Belum ada kategori. Klik "Tambah Kategori" untuk membuat.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
