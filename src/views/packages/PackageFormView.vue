<script setup lang="ts">
/** Tambah / ubah paket alat. */
import { computed, onMounted, reactive, ref, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { assetApi, categoryApi, packageApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import { runAction } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import type { AssetSlim, Category, Package } from '@/types/models'

const route = useRoute()
const router = useRouter()

const uuid = computed(() => route.params.uuid as string | undefined)
const isEdit = computed(() => Boolean(uuid.value))

const existing = ref<Package | null>(null)
const assets = ref<AssetSlim[]>([])
const categories = ref<Category[]>([])
const selected = ref<number[]>([])
const categoryFilter = ref('')
const submitting = ref(false)

const form = reactive({ name: '', description: '' })

const { query, filtered } = useLiveFilter(toRef(assets, 'value'), (asset) =>
  [asset.name, asset.bmn_number, asset.category_name ?? ''].join(' '),
)

const visible = computed(() =>
  filtered.value.filter(
    (asset) => !categoryFilter.value || String(asset.category) === categoryFilter.value,
  ),
)

async function submit() {
  submitting.value = true
  const payload = { name: form.name, description: form.description, asset_ids: selected.value }
  const ok = await runAction(
    () => (isEdit.value ? packageApi.update(uuid.value!, payload) : packageApi.create(payload)),
    { successMessage: isEdit.value ? 'Paket diperbarui.' : 'Paket dibuat.' },
  )
  submitting.value = false
  if (ok) await router.push('/packages')
}

onMounted(async () => {
  const [assetList, categoryList] = await Promise.all([assetApi.search(), categoryApi.list()])
  assets.value = assetList.results
  categories.value = categoryList.results

  if (!uuid.value) return
  const pkg = await packageApi.detail(uuid.value)
  existing.value = pkg
  form.name = pkg.name
  form.description = pkg.description ?? ''
  selected.value = pkg.items.map((item) => item.id)
})
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ isEdit ? 'Ubah Paket' : 'Tambah Paket' }}</h1>
      <p class="subtitle">Kumpulan alat yang bisa dipinjam sekaligus.</p>
      <AuditTrailInfo v-if="isEdit" :record="existing" />
    </div>
    <RouterLink to="/packages" class="btn btn-outline-navy">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </RouterLink>
  </div>

  <form data-testid="package-form" @submit.prevent="submit">
    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card-sb">
          <div class="mb-3">
            <label class="form-label" for="pkgName">Nama Paket <span class="req">*</span></label>
            <input
              id="pkgName"
              v-model="form.name"
              type="text"
              class="form-control"
              required
              data-testid="input-name"
            />
          </div>
          <div class="mb-3">
            <label class="form-label" for="pkgDesc">Deskripsi</label>
            <textarea
              id="pkgDesc"
              v-model="form.description"
              class="form-control"
              rows="4"
              data-testid="input-desc"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card-sb">
          <div class="card-title">Pilih Alat</div>
          <div class="d-flex gap-2 mb-2">
            <select
              v-model="categoryFilter"
              class="form-select form-select-sm"
              style="max-width: 180px"
            >
              <option value="">— Semua Kategori —</option>
              <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
                {{ cat.name }}
              </option>
            </select>
            <input
              v-model="query"
              type="search"
              class="form-control form-control-sm"
              placeholder="Cari alat..."
            />
          </div>

          <div style="max-height: 420px; overflow-y: auto">
            <label
              v-for="asset in visible"
              :key="asset.id"
              class="d-flex gap-2 align-items-center p-2 border-bottom"
            >
              <input
                v-model="selected"
                type="checkbox"
                :value="asset.id"
                class="form-check-input"
                :data-testid="`pkg-asset-${asset.id}`"
              />
              <div class="flex-grow-1">
                <div class="fw-semibold small">
                  {{ asset.name }}
                  <span class="text-slate">— {{ asset.category_name }}</span>
                </div>
                <div class="text-slate small text-mono">{{ asset.bmn_number }}</div>
              </div>
            </label>
            <div v-if="!visible.length" class="text-slate small text-center py-3">
              Tidak ada alat yang cocok dengan pencarian.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-end mt-3">
      <button class="btn btn-primary" :disabled="submitting" data-testid="btn-save-package">
        <i class="fa-solid fa-floppy-disk"></i> Simpan
      </button>
    </div>
  </form>
</template>
