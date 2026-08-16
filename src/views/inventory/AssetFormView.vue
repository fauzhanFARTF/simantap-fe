<script setup lang="ts">
/**
 * Tambah / ubah alat.
 *
 * Saat menambah, Kode Aset & No. DISKOMINFO tidak diisi manual — server yang
 * membuatnya dari kode singkatan kategori. Pratinjau di sini hanya ancar-ancar;
 * nomor final ditentukan ulang saat simpan supaya dua input bersamaan tidak
 * pernah menghasilkan kode kembar.
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { assetApi, categoryApi } from '@/api'
import { ApiError } from '@/api/client'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import { runAction } from '@/composables/useAsync'
import { usePhotoCapture } from '@/composables/usePhotoCapture'
import type { AssetDetail, Category } from '@/types/models'
import { fmtStock } from '@/utils/format'

const UNIT_SUGGESTIONS = ['meter', 'butir', 'roll', 'pcs']

const route = useRoute()
const router = useRouter()

const uuid = computed(() => route.params.uuid as string | undefined)
const isEdit = computed(() => Boolean(uuid.value))

const categories = ref<Category[]>([])
const existing = ref<AssetDetail | null>(null)
const submitting = ref(false)
const removePhoto = ref(false)
const codeError = ref('')
/** Sekali nama diketik sendiri, penyusunan otomatis berhenti mengganggu. */
const nameEdited = ref(false)

const capture = usePhotoCapture('')

const form = reactive({
  name: '',
  category_id: '' as number | '',
  asset_code: '',
  bmn_number: '',
  barcode: '',
  brand: '',
  model: '',
  serial_number: '',
  unit: '',
  qty: '' as number | '',
  purchase_price: '' as number | '',
  purchase_date: '',
  current_value: '' as number | '',
  photo_url: '',
})

const hasPhoto = computed(() => Boolean(existing.value?.photo_url))

/** Nama baku: "KODE Brand Model" — dipakai tombol "samakan otomatis". */
const autoName = computed(() =>
  [form.asset_code, form.brand, form.model].map((part) => part.trim()).filter(Boolean).join(' '),
)

/** Isi nama selama pengguna belum mengetiknya sendiri. */
watch(autoName, (value) => {
  if (!nameEdited.value && value) form.name = value
})

/** Pratinjau nomor otomatis begitu kategori dipilih (khusus alat baru). */
watch(
  () => form.category_id,
  async (categoryId) => {
    codeError.value = ''
    if (isEdit.value || !categoryId) return
    try {
      const preview = await assetApi.nextCode(Number(categoryId))
      form.asset_code = preview.asset_code
      form.bmn_number = preview.bmn_number
    } catch (exception) {
      form.asset_code = ''
      form.bmn_number = ''
      codeError.value =
        exception instanceof ApiError ? exception.message : 'Gagal memuat pratinjau kode.'
    }
  },
)

function syncName(event: Event) {
  event.preventDefault()
  form.name = autoName.value
  nameEdited.value = false
}

async function submit() {
  submitting.value = true
  const payload: Record<string, unknown> = {
    name: form.name,
    category: form.category_id,
    brand: form.brand,
    model: form.model,
    serial_number: form.serial_number,
    unit: form.unit,
    purchase_price: form.purchase_price,
    purchase_date: form.purchase_date,
    current_value: form.current_value,
    photo_url_source: form.photo_url,
  }
  if (form.unit && form.qty !== '') payload.qty_current = form.qty
  if (isEdit.value) {
    payload.asset_code = form.asset_code
    payload.bmn_number = form.bmn_number
    payload.barcode = form.barcode
  }
  if (capture.file.value) payload.photo = capture.file.value
  if (isEdit.value && removePhoto.value) payload.remove_photo = true

  const ok = await runAction(
    () => (isEdit.value ? assetApi.update(uuid.value!, payload) : assetApi.create(payload)),
    { successMessage: isEdit.value ? 'Perubahan disimpan.' : 'Alat berhasil ditambahkan.' },
  )
  submitting.value = false
  if (ok) await router.push('/inventory')
}

onMounted(async () => {
  categories.value = (await categoryApi.list()).results
  if (!uuid.value) return

  const asset = await assetApi.detail(uuid.value)
  existing.value = asset
  nameEdited.value = true // data tersimpan tidak boleh ditimpa penyusun otomatis
  Object.assign(form, {
    name: asset.name,
    category_id: asset.category ?? '',
    asset_code: asset.asset_code,
    bmn_number: asset.bmn_number,
    barcode: asset.barcode,
    brand: asset.brand ?? '',
    model: asset.model ?? '',
    serial_number: asset.serial_number ?? '',
    unit: asset.unit ?? '',
    qty: asset.qty_current ?? '',
    purchase_price: asset.purchase_price ?? '',
    purchase_date: asset.purchase_date ?? '',
    current_value: asset.current_value ?? '',
  })
  if (asset.photo_url) capture.preview.value = asset.photo_url
})
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ isEdit ? 'Ubah Alat' : 'Tambah Alat Baru' }}</h1>
      <p class="subtitle">Registrasi aset streaming BMN.</p>
      <AuditTrailInfo v-if="isEdit" :record="existing" />
    </div>
    <RouterLink to="/inventory" class="btn btn-outline-navy">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </RouterLink>
  </div>

  <form data-testid="asset-form" @submit.prevent="submit">
    <div class="card-sb">
      <div class="row g-3">
        <div class="col-md-12">
          <label class="form-label">Foto Alat</label>
          <div class="d-flex align-items-start gap-3 flex-wrap">
            <div v-if="capture.preview.value">
              <img
                :src="capture.preview.value"
                alt="Foto alat"
                style="
                  width: 140px;
                  height: 140px;
                  object-fit: cover;
                  border-radius: 12px;
                  border: 1px solid var(--sb-line);
                "
              />
            </div>
            <div class="flex-grow-1" style="min-width: 220px">
              <div class="d-flex gap-2 flex-wrap">
                <input
                  type="file"
                  class="form-control"
                  accept="image/jpeg,image/png,image/webp"
                  style="max-width: 280px"
                  data-testid="input-photo"
                  @change="capture.selectFile"
                />
                <button
                  type="button"
                  class="btn btn-outline-navy"
                  data-testid="btn-open-camera"
                  @click="capture.openCamera()"
                >
                  <i class="fa-solid fa-camera"></i> Ambil dari Kamera
                </button>
              </div>

              <div class="input-group mt-2" style="max-width: 420px">
                <span class="input-group-text"><i class="fa-solid fa-link"></i></span>
                <input
                  v-model="form.photo_url"
                  type="url"
                  class="form-control"
                  placeholder="atau tempel link foto / Google Drive"
                  data-testid="input-photo-url"
                />
              </div>
              <div class="form-text">
                JPG, PNG, atau WEBP, maks 10MB. Bisa unggah file, ambil dari kamera,
                <strong>atau</strong> tempel link foto (mis. Google Drive yang dibagikan publik).
                Opsional — jika kosong, dipakai logo Diskominfo.
              </div>

              <div v-if="isEdit && hasPhoto" class="form-check mt-2">
                <input
                  id="removePhotoCheck"
                  v-model="removePhoto"
                  class="form-check-input"
                  type="checkbox"
                  data-testid="input-remove-photo"
                />
                <label class="form-check-label" for="removePhotoCheck">Hapus foto saat ini</label>
              </div>

              <div
                v-show="capture.cameraOpen.value"
                class="mt-3 p-2 border rounded-3"
                data-testid="camera-panel"
              >
                <video
                  :ref="(el) => (capture.videoRef.value = el as HTMLVideoElement | null)"
                  autoplay
                  playsinline
                  muted
                  style="width: 100%; max-width: 320px; border-radius: 8px; background: #000"
                ></video>
                <div class="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    data-testid="btn-capture-photo"
                    @click="capture.capture()"
                  >
                    <i class="fa-solid fa-circle-dot"></i> Ambil Foto
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-navy btn-sm"
                    data-testid="btn-switch-camera"
                    title="Ganti kamera depan/belakang"
                    @click="capture.switchCamera()"
                  >
                    <i class="fa-solid fa-rotate"></i> Ganti Kamera
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-navy btn-sm"
                    data-testid="btn-close-camera"
                    @click="capture.closeCamera()"
                  >
                    Batal
                  </button>
                </div>
              </div>
              <div v-if="capture.error.value" class="form-text text-danger">
                {{ capture.error.value }}
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="categorySelect">
            Kategori <span v-if="!isEdit" class="req">*</span>
          </label>
          <select
            id="categorySelect"
            v-model="form.category_id"
            class="form-select"
            :required="!isEdit"
            data-testid="input-category"
          >
            <option value="">— Pilih —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}{{ cat.code_prefix ? ` (${cat.code_prefix})` : '' }}
            </option>
          </select>
          <div v-if="!isEdit" class="form-text">
            Kode Aset &amp; No. DISKOMINFO dibuat otomatis dari kode singkatan kategori.
          </div>
          <div v-if="codeError" class="form-text text-danger">{{ codeError }}</div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="assetCodeField">
            Kode Aset <span v-if="isEdit" class="req">*</span>
          </label>
          <input
            id="assetCodeField"
            v-model="form.asset_code"
            type="text"
            class="form-control"
            :class="{ 'bg-light': !isEdit }"
            :required="isEdit"
            :readonly="!isEdit"
            :placeholder="isEdit ? 'mis. CAM-004' : 'otomatis dari kategori'"
            data-testid="input-code"
          />
          <div class="form-text">
            {{ isEdit ? 'Kode internal, unik.' : 'Dibuat otomatis, tidak perlu diisi.' }}
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="bmnField">
            Nomor BMD <span v-if="isEdit" class="req">*</span>
          </label>
          <input
            id="bmnField"
            v-model="form.bmn_number"
            type="text"
            class="form-control"
            :class="{ 'bg-light': !isEdit }"
            :required="isEdit"
            :readonly="!isEdit"
            :placeholder="isEdit ? 'mis. BMD-2024-KMR-004' : 'otomatis dari kategori'"
            data-testid="input-bmn"
          />
        </div>

        <div v-if="isEdit" class="col-md-4">
          <label class="form-label" for="barcodeField">Nilai QR Code</label>
          <input
            id="barcodeField"
            v-model="form.barcode"
            type="text"
            class="form-control"
            placeholder="Kosongkan → sama dengan No. DISKOMINFO"
            data-testid="input-barcode"
          />
        </div>

        <div :class="isEdit ? 'col-md-8' : 'col-md-12'">
          <label class="form-label" for="nameField">Nama Alat <span class="req">*</span></label>
          <input
            id="nameField"
            v-model="form.name"
            type="text"
            class="form-control"
            required
            data-testid="input-name"
            @input="nameEdited = true"
          />
          <div class="form-text">
            Terisi otomatis dari <strong>Kode Aset + Brand + Model</strong> — mis.
            <em>AP-001 Ubiquity U6+ UNIFI WiFi 6</em>. Boleh diketik sendiri; kalau sudah diubah
            manual, klik
            <a href="#" data-testid="btn-sync-name" @click="syncName">samakan otomatis</a> untuk
            menyusunnya ulang.
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="brandField">Brand</label>
          <input
            id="brandField"
            v-model="form.brand"
            type="text"
            class="form-control"
            data-testid="input-brand"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label" for="modelField">Model</label>
          <input
            id="modelField"
            v-model="form.model"
            type="text"
            class="form-control"
            data-testid="input-model"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label" for="serialField">Serial Number</label>
          <input
            id="serialField"
            v-model="form.serial_number"
            type="text"
            class="form-control"
            data-testid="input-serial"
          />
        </div>
      </div>
    </div>

    <div class="card-sb mt-3">
      <h6 class="mb-1">
        <i class="fa-solid fa-layer-group"></i> Satuan &amp; Stok
        <span class="text-slate fw-normal small">(opsional)</span>
      </h6>
      <div class="form-text mb-3">
        Isi bila alat ini dilacak per jumlah — mis. <strong>kabel</strong> (satuan
        <em>meter</em>) atau <strong>RJ45</strong> (satuan <em>butir</em>, satu QR = satu bungkus).
        Kosongkan untuk alat satuan biasa (kamera, tripod, dll).
      </div>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label" for="unitField">Satuan Stok</label>
          <input
            id="unitField"
            v-model="form.unit"
            type="text"
            class="form-control"
            placeholder="mis. meter / butir"
            list="unitList"
            data-testid="input-unit"
          />
          <datalist id="unitList">
            <option v-for="unit in UNIT_SUGGESTIONS" :key="unit" :value="unit"></option>
          </datalist>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="qtyField">
            {{ isEdit ? 'Stok Saat Ini' : 'Stok Awal' }}
          </label>
          <input
            id="qtyField"
            v-model="form.qty"
            type="number"
            step="0.01"
            min="0"
            class="form-control"
            placeholder="mis. 305"
            data-testid="input-qty"
          />
          <div v-if="existing?.qty_initial" class="form-text">
            Stok awal: {{ fmtStock(existing.qty_initial, existing.unit) }}
          </div>
        </div>
      </div>
    </div>

    <div class="card-sb mt-3">
      <h6 class="mb-3"><i class="fa-solid fa-money-bill-wave"></i> Informasi Harga</h6>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label" for="priceField">Harga Perolehan (Harga Dulu)</label>
          <div class="input-group">
            <span class="input-group-text">Rp</span>
            <input
              id="priceField"
              v-model="form.purchase_price"
              type="number"
              step="0.01"
              min="0"
              class="form-control"
              placeholder="mis. 15000000"
              data-testid="input-purchase-price"
            />
          </div>
          <div class="form-text">Harga saat aset pertama kali dibeli/diperoleh.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="purchaseDateField">Tanggal Perolehan</label>
          <input
            id="purchaseDateField"
            v-model="form.purchase_date"
            type="date"
            class="form-control"
            data-testid="input-purchase-date"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label" for="valueField">Nilai Sekarang</label>
          <div class="input-group">
            <span class="input-group-text">Rp</span>
            <input
              id="valueField"
              v-model="form.current_value"
              type="number"
              step="0.01"
              min="0"
              class="form-control"
              placeholder="mis. 9000000"
              data-testid="input-current-value"
            />
          </div>
          <div class="form-text">
            Estimasi nilai buku / nilai wajar aset saat ini (setelah penyusutan).
          </div>
        </div>
      </div>
    </div>

    <div class="text-end mt-3">
      <button class="btn btn-primary" :disabled="submitting" data-testid="btn-save-asset">
        <i class="fa-solid fa-floppy-disk"></i> Simpan
      </button>
    </div>
  </form>
</template>
