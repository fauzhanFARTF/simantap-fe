<script setup lang="ts">
/** Tambah / ubah kategori alat. */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { categoryApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { runAction } from '@/composables/useAsync'
import type { Category } from '@/types/models'

const route = useRoute()
const router = useRouter()

const uuid = computed(() => route.params.uuid as string | undefined)
const isEdit = computed(() => Boolean(uuid.value))

const existing = ref<Category | null>(null)
const submitting = ref(false)
const form = reactive({ name: '', code_prefix: '', description: '' })

/** Kode singkatan selalu huruf/angka kapital — sama dengan normalisasi server. */
function normalizePrefix(event: Event) {
  const input = event.target as HTMLInputElement
  form.code_prefix = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function submit() {
  submitting.value = true
  const payload = {
    name: form.name,
    code_prefix: form.code_prefix,
    description: form.description,
  }
  const ok = await runAction(
    () => (isEdit.value ? categoryApi.update(uuid.value!, payload) : categoryApi.create(payload)),
    { successMessage: isEdit.value ? 'Kategori diperbarui.' : 'Kategori ditambahkan.' },
  )
  submitting.value = false
  if (ok) await router.push('/categories')
}

onMounted(async () => {
  if (!uuid.value) return
  const category = await categoryApi.detail(uuid.value)
  existing.value = category
  form.name = category.name
  form.code_prefix = category.code_prefix ?? ''
  form.description = category.description ?? ''
})
</script>

<template>
  <PageHeader
    :title="isEdit ? 'Ubah Kategori' : 'Tambah Kategori'"
    subtitle="Grouping alat berdasarkan jenis untuk memudahkan pencarian."
  >
    <template #actions>
      <RouterLink to="/categories" class="btn btn-outline-navy">
        <i class="fa-solid fa-arrow-left"></i> Kembali
      </RouterLink>
    </template>
  </PageHeader>
  <AuditTrailInfo v-if="isEdit" :record="existing" />

  <form data-testid="category-form" @submit.prevent="submit">
    <div class="card-sb">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="catName">
            Nama Kategori <span class="req">*</span>
          </label>
          <input
            id="catName"
            v-model="form.name"
            type="text"
            class="form-control"
            required
            placeholder="mis. Kamera Video"
            data-testid="input-cat-name"
          />
          <div class="form-text">Nama harus unik.</div>
        </div>

        <div class="col-md-6">
          <label class="form-label" for="catPrefix">
            Kode Singkatan <span class="req">*</span>
          </label>
          <input
            id="catPrefix"
            :value="form.code_prefix"
            type="text"
            class="form-control text-uppercase"
            required
            maxlength="20"
            pattern="[A-Za-z0-9]+"
            placeholder="mis. CAMVIDEO"
            data-testid="input-cat-prefix"
            @input="normalizePrefix"
          />
          <div class="form-text">
            Huruf/angka tanpa spasi. Dipakai untuk Kode Aset otomatis, mis.
            <strong>CAMVIDEO-001</strong>.
          </div>
        </div>

        <div class="col-md-12">
          <label class="form-label" for="catDesc">Deskripsi</label>
          <input
            id="catDesc"
            v-model="form.description"
            type="text"
            class="form-control"
            placeholder="mis. Kamera video / camcorder / DSLR"
            data-testid="input-cat-desc"
          />
        </div>
      </div>
    </div>

    <div class="text-end mt-3">
      <button class="btn btn-primary" :disabled="submitting" data-testid="btn-save-category">
        <i class="fa-solid fa-floppy-disk"></i> {{ submitting ? 'Menyimpan…' : 'Simpan' }}
      </button>
    </div>
  </form>
</template>
