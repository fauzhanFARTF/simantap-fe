<script setup lang="ts">
/**
 * Manajemen Alat / Aset.
 *
 * Pimpinan adalah peran pengawas: server membatasinya hanya melihat alat yang
 * sedang dipinjam dan menandainya lewat `pimpinan_only`, sehingga filter status
 * di sini ikut disembunyikan agar tidak menjanjikan yang tidak bisa dipenuhi.
 */
import { computed, onMounted, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'

import { assetApi, categoryApi } from '@/api'
import HintBox from '@/components/common/HintBox.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Asset, Category } from '@/types/models'
import { fmtRupiah, fmtStock, photoUrl } from '@/utils/format'

const STATUS_FILTERS = ['Available', 'Booked', 'CheckedOut', 'Damaged', 'Lost', 'Retired']

const auth = useAuthStore()
const router = useRouter()

const { data, loading, run } = useAsync(() => assetApi.list(), {
  results: [] as Asset[], count: 0, page: 1, pages: 1, page_size: 0, pimpinan_only: false,
})
const categories = ref<Category[]>([])
const selected = ref<string[]>([])
const categoryFilter = ref('')
const statusFilter = ref('')

const assets = computed(() => data.value.results)
const pimpinanOnly = computed(() => data.value.pimpinan_only)

const { query, filtered } = useLiveFilter(toRef(assets, 'value'), (asset) =>
  [
    asset.name, asset.asset_code, asset.bmn_number, asset.category_name ?? '',
    asset.brand ?? '', asset.model ?? '', asset.serial_number ?? '',
  ].join(' '),
)

const visible = computed(() =>
  filtered.value.filter(
    (asset) =>
      (!categoryFilter.value || String(asset.category) === categoryFilter.value) &&
      (!statusFilter.value || asset.status === statusFilter.value),
  ),
)

const canManage = computed(() =>
  auth.hasRole('admin_gudang', 'admin', 'administrator_pembantu_manajemen_alat'),
)
const allChecked = computed(
  () => visible.value.length > 0 && selected.value.length === visible.value.length,
)

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? visible.value.map((asset) => asset.uuid) : []
}

function printSelected() {
  router.push({ name: 'barcode-print', query: { uuids: selected.value.join(',') } })
}

async function remove(asset: Asset) {
  const confirmed = await confirmAction(
    `Hapus alat "${asset.name}"? (masih bisa dipulihkan lewat Riwayat Terhapus)`,
  )
  if (!confirmed) return
  if (await runAction(() => assetApi.remove(asset.uuid))) await run()
}

async function toggleRetire(asset: Asset) {
  const retired = asset.status === 'Retired'
  const confirmed = await confirmAction(
    retired
      ? `Aktifkan kembali "${asset.name}" menjadi Tersedia?`
      : `Nonaktifkan "${asset.name}"? Alat tidak akan muncul di form peminjaman.`,
  )
  if (!confirmed) return
  const call = retired ? assetApi.unretire : assetApi.retire
  if (await runAction(() => call(asset.uuid))) await run()
}

onMounted(async () => {
  await run()
  categories.value = (await categoryApi.list()).results
})
</script>

<template>
  <PageHeader
    title="Manajemen Alat / Aset"
    :subtitle="
      pimpinanOnly
        ? `Alat yang sedang dipinjam — total ${assets.length} item ditampilkan.`
        : `Inventaris aset streaming BMN — total ${assets.length} item ditampilkan.`
    "
  >
    <template v-if="canManage" #actions>
      <button
        type="button"
        class="btn btn-outline-navy"
        :disabled="!selected.length"
        data-testid="btn-print-selected"
        @click="printSelected"
      >
        <i class="fa-solid fa-qrcode"></i> Cetak QR Code Terpilih ({{ selected.length }})
      </button>
      <RouterLink to="/inventory/create" class="btn btn-amber" data-testid="btn-new-asset">
        <i class="fa-solid fa-plus"></i> Tambah Alat
      </RouterLink>
      <ResetButton
        scope="assets"
        label="Reset Alat"
        confirm="RESET SEMUA alat? Seluruh alat dihapus PERMANEN, termasuk peminjaman & perbaikan yang terkait. Tindakan ini TIDAK BISA dibatalkan."
        @done="run"
      />
    </template>
  </PageHeader>

  <div class="card-sb">
    <HintBox v-if="canManage">
      Setiap alat punya QR code unik. Centang alat lalu klik
      <strong>"Cetak QR Code Terpilih"</strong> untuk mencetak stiker QR yang bisa ditempel di
      alat. Stiker ini bisa dipindai memakai <strong>kamera HP</strong> maupun
      <strong>alat pemindai QR (2D scanner USB/Bluetooth)</strong> saat penyerahan/pengembalian
      alat.
    </HintBox>

    <div class="row g-2 mb-3">
      <div class="col-md-5">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari nama alat, kode, atau BMN... (langsung tampil)"
          autocomplete="off"
          data-testid="search-input"
        />
      </div>
      <div class="col-md-3">
        <select v-model="categoryFilter" class="form-select" data-testid="filter-category">
          <option value="">— Semua Kategori —</option>
          <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div v-if="!pimpinanOnly" class="col-md-4">
        <select v-model="statusFilter" class="form-select" data-testid="filter-status">
          <option value="">— Semua Status —</option>
          <option v-for="status in STATUS_FILTERS" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="assets-table">
        <thead>
          <tr>
            <th v-if="canManage" style="width: 32px">
              <input
                type="checkbox"
                class="form-check-input"
                aria-label="Pilih semua"
                :checked="allChecked"
                @change="toggleAll"
              />
            </th>
            <th>Foto</th>
            <th>Kode</th>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Brand/Model</th>
            <th>No. DISKOMINFO</th>
            <th>Harga Dulu</th>
            <th>Nilai Sekarang</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in visible" :key="asset.uuid">
            <td v-if="canManage">
              <input
                v-model="selected"
                type="checkbox"
                class="form-check-input"
                :value="asset.uuid"
                :aria-label="`Pilih ${asset.name}`"
              />
            </td>
            <td>
              <img
                :src="photoUrl(asset.photo_url)"
                :alt="`Foto ${asset.name}`"
                style="
                  width: 72px;
                  height: 72px;
                  object-fit: cover;
                  border-radius: 8px;
                  border: 1px solid var(--sb-line);
                  background: #fff;
                "
              />
            </td>
            <td class="code">{{ asset.asset_code }}</td>
            <td>
              <div class="fw-semibold">{{ asset.name }}</div>
              <div v-if="asset.unit" class="text-slate small">
                <span class="badge bg-info text-dark">
                  <i class="fa-solid fa-layer-group"></i>
                  Stok: {{ fmtStock(asset.qty_current, asset.unit) }}
                </span>
              </div>
              <div v-if="asset.serial_number" class="text-slate small text-mono">
                SN: {{ asset.serial_number }}
              </div>
            </td>
            <td class="small">{{ asset.category_name || '—' }}</td>
            <td class="small">
              {{ [asset.brand, asset.model].filter(Boolean).join(' ') || '—' }}
            </td>
            <td class="text-mono small">{{ asset.bmn_number }}</td>
            <td class="small">{{ fmtRupiah(asset.purchase_price) }}</td>
            <td class="small">{{ fmtRupiah(asset.current_value) }}</td>
            <td><StatusBadge :status="asset.status" :label="asset.status_label" /></td>
            <td class="text-nowrap">
              <template v-if="canManage">
                <RouterLink
                  :to="`/inventory/${asset.uuid}/edit`"
                  class="btn btn-sm btn-outline-navy"
                  :data-testid="`btn-edit-asset-${asset.id}`"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </RouterLink>
                <button
                  class="btn btn-sm btn-outline-navy ms-1"
                  :title="asset.status === 'Retired' ? 'Aktifkan kembali' : 'Nonaktifkan'"
                  @click="toggleRetire(asset)"
                >
                  <i
                    :class="
                      asset.status === 'Retired'
                        ? 'fa-solid fa-rotate-left'
                        : 'fa-solid fa-box-archive'
                    "
                  ></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-danger ms-1"
                  :data-testid="`btn-delete-asset-${asset.id}`"
                  @click="remove(asset)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </template>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td :colspan="canManage ? 11 : 10" class="text-center text-slate py-4">
              {{
                assets.length
                  ? 'Tidak ada alat yang cocok dengan pencarian / filter.'
                  : 'Belum ada alat.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
