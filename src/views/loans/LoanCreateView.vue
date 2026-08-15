<script setup lang="ts">
/**
 * Form pengajuan peminjaman.
 *
 * Dua jenis kebutuhan dilayani satu form. Bedanya bukan sekadar tampilan:
 *  - Streaming/Zoom memakai nama acara + rentang tanggal;
 *  - Kebutuhan Jaringan memakai nama OPD, dan keputusan "dikembalikan atau
 *    tetap di OPD" ditentukan PER BARANG, bukan per pengajuan.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { loanApi, type LoanFormOptions } from '@/api'
import HintBox from '@/components/common/HintBox.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { runAction, useAsync } from '@/composables/useAsync'
import { useUiStore } from '@/stores/ui'
import type { AssetSlim } from '@/types/models'
import { fmtStock, photoUrl } from '@/utils/format'

const router = useRouter()
const ui = useUiStore()

const EMPTY_OPTIONS: LoanFormOptions = {
  categories: [], assets: [], packages: [], it_staff: [],
  holders: {}, followers: {}, is_personal_borrower: false,
}

const { data: options, loading, run } = useAsync(
  () => loanApi.formOptions(),
  EMPTY_OPTIONS,
)

const todayIso = new Date().toISOString().slice(0, 10)

const loanType = ref<'event' | 'opd'>('event')
const submitting = ref(false)

const form = reactive({
  event_name: '',
  event_location: '',
  purpose: '',
  start_date: '',
  end_date: '',
  start_time: '',
  opd_name: '',
  opd_purpose: '',
  opd_start_date: todayIso,
})

const selectedAssets = ref<number[]>([])
const selectedPackages = ref<number[]>([])
const participants = ref<number[]>([])
/** Khusus OPD: asset_id → tanggal kembali. Tidak ada entri = tetap di OPD. */
const returnDates = reactive<Record<number, string>>({})
const returning = reactive<Record<number, boolean>>({})

const assetSearch = ref('')
const categoryFilter = ref('')

/** Set dipakai agar pengecekan "sudah dipilih?" tetap O(1) saat daftar panjang. */
const selectedSet = computed(() => new Set(selectedAssets.value))

const filteredAssets = computed(() => {
  const terms = assetSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return options.value.assets.filter((asset) => {
    if (categoryFilter.value && String(asset.category) !== categoryFilter.value) return false
    if (!terms.length) return true
    const haystack = [
      asset.name, asset.asset_code, asset.bmn_number, asset.category_name ?? '',
      asset.brand ?? '', asset.model ?? '', asset.serial_number ?? '',
      ...(options.value.holders[asset.id] ?? []),
      ...(options.value.followers[asset.id] ?? []),
    ]
      .join(' ')
      .toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
})

/**
 * Alat yang dicentang mengapung ke atas daftar.
 *
 * Tanpa ini, alat yang baru dipilih tenggelam di antara puluhan alat lain dan
 * pemohon kehilangan jejak apa saja yang sudah ia ambil — perilaku yang sama
 * dengan `reorderCheckedAssets()` di aplikasi lama.
 *
 * `sort` di JavaScript bersifat stabil (ES2019+), jadi urutan nama di dalam
 * masing-masing kelompok tetap terjaga; hanya kelompoknya yang bertukar tempat.
 * Menyalin array dulu karena `sort` mengubah array aslinya di tempat.
 */
const visibleAssets = computed(() => {
  const rank = (asset: AssetSlim) => (selectedSet.value.has(asset.id) ? 0 : 1)
  return [...filteredAssets.value].sort((a, b) => rank(a) - rank(b))
})

/** Barang terpilih pada mode OPD — tempat menandai mana yang dikembalikan. */
const opdSelectedAssets = computed(() =>
  options.value.assets.filter((asset) => selectedAssets.value.includes(asset.id)),
)

const showParticipants = computed(
  () => !options.value.is_personal_borrower && options.value.it_staff.length > 0,
)

function stockLabel(asset: AssetSlim): string {
  return fmtStock(asset.qty_current, asset.unit)
}

async function submit() {
  if (!selectedAssets.value.length && !selectedPackages.value.length) {
    ui.error('Pilih minimal 1 alat / paket.')
    return
  }

  const isOpd = loanType.value === 'opd'
  if (isOpd) {
    // Tanggal kembali wajib untuk setiap barang yang ditandai dikembalikan —
    // tanpa itu barangnya tidak pernah masuk antrean Pengembalian.
    const missing = opdSelectedAssets.value.filter(
      (asset) => returning[asset.id] && !returnDates[asset.id],
    )
    if (missing.length) {
      ui.error('Isi tanggal kembali untuk setiap barang yang ditandai Dikembalikan.')
      return
    }
  }

  const payload = isOpd
    ? {
        loan_type: 'opd' as const,
        event_name: form.opd_name,
        event_location: form.opd_name,
        purpose: form.opd_purpose,
        start_date: form.opd_start_date,
        asset_ids: selectedAssets.value,
        package_ids: selectedPackages.value,
        participant_ids: participants.value,
        return_dates: Object.fromEntries(
          opdSelectedAssets.value
            .filter((asset) => returning[asset.id])
            .map((asset) => [String(asset.id), returnDates[asset.id]!]),
        ),
      }
    : {
        loan_type: 'event' as const,
        event_name: form.event_name,
        event_location: form.event_location,
        purpose: form.purpose,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time || null,
        asset_ids: selectedAssets.value,
        package_ids: selectedPackages.value,
        participant_ids: participants.value,
      }

  submitting.value = true
  await runAction(() => loanApi.create(payload), {
    onSuccess: (loan) => void router.push(`/loans/${loan.uuid}`),
  })
  submitting.value = false
}

onMounted(run)
</script>

<template>
  <div class="page-header">
    <div>
      <h1>Ajukan Peminjaman</h1>
      <p class="subtitle">Pilih jenis kebutuhan, lalu alat/paket yang diperlukan.</p>
    </div>
    <RouterLink to="/loans" class="btn btn-outline-navy">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </RouterLink>
  </div>

  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat data alat…</div>

  <form v-else data-testid="loan-create-form" @submit.prevent="submit">
    <div class="row g-3">
      <div class="col-lg-5">
        <div class="loan-type-toggle mb-3" role="tablist" data-testid="loan-type-toggle">
          <button
            type="button"
            class="lt-btn"
            :class="{ active: loanType === 'event' }"
            title="Peminjaman barang untuk kebutuhan streaming / zoom meeting"
            data-testid="lt-event"
            @click="loanType = 'event'"
          >
            <i class="fa-solid fa-video"></i> Streaming / Zoom
          </button>
          <button
            type="button"
            class="lt-btn"
            :class="{ active: loanType === 'opd' }"
            title="Peminjaman barang untuk kebutuhan jaringan"
            data-testid="lt-opd"
            @click="loanType = 'opd'"
          >
            <i class="fa-solid fa-network-wired"></i> Kebutuhan Jaringan
          </button>
        </div>

        <!-- ── Streaming / Zoom ────────────────────────────────────────────── -->
        <div v-show="loanType === 'event'" class="card-sb" data-testid="block-event">
          <div class="card-title">Kebutuhan Streaming / Zoom Meeting</div>

          <div class="mb-3">
            <label class="form-label" for="eventName">Nama Acara <span class="req">*</span></label>
            <input
              id="eventName"
              v-model="form.event_name"
              type="text"
              class="form-control"
              :required="loanType === 'event'"
              placeholder="mis. Live Streaming Rapat Paripurna"
              data-testid="input-event-name"
            />
          </div>

          <div class="mb-3">
            <label class="form-label" for="eventLocation">Lokasi Acara</label>
            <input
              id="eventLocation"
              v-model="form.event_location"
              type="text"
              class="form-control"
              placeholder="Gedung Smart Building, Ruang..."
              data-testid="input-event-location"
            />
          </div>

          <div class="mb-3">
            <label class="form-label" for="eventPurpose">Tujuan / Keperluan</label>
            <textarea
              id="eventPurpose"
              v-model="form.purpose"
              rows="3"
              class="form-control"
              placeholder="Jelaskan singkat kebutuhan penggunaan alat"
              data-testid="input-purpose"
            ></textarea>
          </div>

          <div v-if="!options.is_personal_borrower" class="mb-3">
            <label class="form-label">Personel yang Dilibatkan</label>
            <div v-if="!options.it_staff.length" class="form-text">
              Belum ada user ber-role IT Staff lain yang bisa dilibatkan. Atur
              <strong>IT Staff</strong> sebagai role utama atau peran tambahan user di Manajemen
              User agar bisa dipilih.
            </div>
            <template v-else>
              <div
                class="border rounded-3 p-2"
                style="max-height: 180px; overflow-y: auto"
                data-testid="participants-box"
              >
                <div v-for="staff in options.it_staff" :key="staff.id" class="form-check">
                  <input
                    :id="`part${staff.id}`"
                    v-model="participants"
                    class="form-check-input"
                    type="checkbox"
                    :value="staff.id"
                    :data-testid="`participant-${staff.id}`"
                  />
                  <label class="form-check-label" :for="`part${staff.id}`">
                    {{ staff.name }}
                    <span v-if="staff.unit_kerja" class="text-slate small">
                      · {{ staff.unit_kerja }}
                    </span>
                  </label>
                </div>
              </div>
              <div class="form-text">
                Hanya personel ber-role IT Staff yang dapat dilibatkan — termasuk user yang
                memegang IT Staff sebagai peran tambahan. Nama Anda sendiri tidak ditampilkan
                karena sudah tercatat sebagai pemohon/penanggungjawab.
              </div>
            </template>
          </div>

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label" for="startDate">
                Tanggal Mulai <span class="req">*</span>
              </label>
              <input
                id="startDate"
                v-model="form.start_date"
                type="date"
                class="form-control"
                :required="loanType === 'event'"
                :min="todayIso"
                data-testid="input-start-date"
              />
            </div>
            <div class="col-6">
              <label class="form-label" for="endDate">
                Tanggal Selesai <span class="req">*</span>
              </label>
              <input
                id="endDate"
                v-model="form.end_date"
                type="date"
                class="form-control"
                :required="loanType === 'event'"
                :min="form.start_date || todayIso"
                data-testid="input-end-date"
              />
            </div>
            <div class="col-6">
              <label class="form-label" for="startTime">Jam Acara</label>
              <input
                id="startTime"
                v-model="form.start_time"
                type="time"
                class="form-control"
                data-testid="input-start-time"
              />
            </div>
          </div>
        </div>

        <!-- ── Kebutuhan Jaringan (OPD) ────────────────────────────────────── -->
        <div v-show="loanType === 'opd'" class="card-sb" data-testid="block-opd">
          <div class="card-title">Kebutuhan Jaringan</div>

          <HintBox>
            Barang untuk OPD dikeluarkan <strong>tanpa batas waktu</strong>. Tanggal keluar dicatat
            <strong>saat barang benar-benar diserahkan dari gudang</strong>, bukan sekarang. Barang
            <strong>pinjam pakai</strong> tetap milik Diskominfo dan dikembalikan lewat penyerahan
            aset bila rusak; barang <strong>habis pakai</strong> diserahkan penuh ke OPD dan tidak
            dikembalikan.
          </HintBox>

          <div class="mb-3">
            <label class="form-label" for="opdName">Nama OPD <span class="req">*</span></label>
            <input
              id="opdName"
              v-model="form.opd_name"
              type="text"
              class="form-control"
              :required="loanType === 'opd'"
              placeholder="mis. Dinas Pendidikan Kabupaten Tangerang"
              data-testid="input-opd-name"
            />
            <div class="form-text">
              Ketik nama OPD tujuan. Daftar pilihan menyusul setelah data resmi tersedia.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label" for="opdPurpose">Tujuan / Keperluan</label>
            <textarea
              id="opdPurpose"
              v-model="form.opd_purpose"
              rows="3"
              class="form-control"
              placeholder="Jelaskan singkat kebutuhan / penempatan alat di OPD"
              data-testid="input-opd-purpose"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label" for="opdStartDate">
              Tanggal Pinjam <span class="req">*</span>
            </label>
            <input
              id="opdStartDate"
              v-model="form.opd_start_date"
              type="date"
              class="form-control"
              :required="loanType === 'opd'"
              data-testid="input-opd-start-date"
            />
          </div>

          <div v-if="showParticipants" class="mb-3">
            <label class="form-label">Personel yang Dilibatkan dalam Instalasi</label>
            <div
              class="border rounded-3 p-2"
              style="max-height: 180px; overflow-y: auto"
              data-testid="opd-participants-box"
            >
              <div v-for="staff in options.it_staff" :key="staff.id" class="form-check">
                <input
                  :id="`opdpart${staff.id}`"
                  v-model="participants"
                  class="form-check-input"
                  type="checkbox"
                  :value="staff.id"
                  :data-testid="`opd-participant-${staff.id}`"
                />
                <label class="form-check-label" :for="`opdpart${staff.id}`">
                  {{ staff.name }}
                  <span v-if="staff.unit_kerja" class="text-slate small">
                    · {{ staff.unit_kerja }}
                  </span>
                </label>
              </div>
            </div>
            <div class="form-text">
              Boleh dikosongkan bila tidak ada personel yang perlu ikut memasang.
            </div>
          </div>

          <div class="mb-1">
            <label class="form-label">Daftar Barang</label>
            <div
              class="border rounded-3 p-2"
              style="max-height: 260px; overflow-y: auto"
              data-testid="opd-consumable-box"
            >
              <div
                v-if="!opdSelectedAssets.length"
                class="text-slate small py-1"
              >
                Pilih alat di sebelah kanan terlebih dahulu. Alat yang dipilih akan muncul di sini.
              </div>
              <div
                v-for="asset in opdSelectedAssets"
                :key="asset.id"
                class="d-flex align-items-center gap-2 py-1 flex-wrap"
              >
                <div class="form-check mb-0">
                  <input
                    :id="`ret${asset.id}`"
                    v-model="returning[asset.id]"
                    class="form-check-input"
                    type="checkbox"
                    :data-testid="`opd-return-${asset.id}`"
                  />
                  <label class="form-check-label small" :for="`ret${asset.id}`">
                    {{ asset.name }}
                    <span class="text-slate text-mono">· {{ asset.asset_code }}</span>
                  </label>
                </div>
                <input
                  v-if="returning[asset.id]"
                  v-model="returnDates[asset.id]"
                  type="date"
                  class="form-control form-control-sm"
                  style="max-width: 160px"
                  :min="form.opd_start_date"
                  required
                  :data-testid="`opd-return-date-${asset.id}`"
                />
                <span v-else class="badge bg-secondary">Tetap di OPD</span>
              </div>
            </div>
            <div class="form-text">
              Centang <strong>Dikembalikan</strong> pada barang yang dipinjam sementara, lalu isi
              tanggal kembalinya. Barang yang tidak dicentang dianggap
              <strong>tetap berada di OPD</strong> (setelah diserahkan berstatus
              <strong>Di OPD</strong> dan tidak masuk Pengembalian).
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pemilihan alat & paket ──────────────────────────────────────────── -->
      <div class="col-lg-7">
        <div class="card-sb">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="card-title mb-0">Pilih Paket Alat</div>
            <span class="text-slate small">Opsional — pilih preset untuk kebutuhan umum</span>
          </div>
          <div class="row g-2">
            <div v-for="pkg in options.packages" :key="pkg.id" class="col-md-6">
              <label class="d-flex gap-2 p-3 border rounded-3 h-100" style="cursor: pointer">
                <input
                  v-model="selectedPackages"
                  type="checkbox"
                  :value="pkg.id"
                  class="form-check-input mt-1"
                  :data-testid="`pkg-${pkg.id}`"
                />
                <div>
                  <div class="fw-semibold">{{ pkg.name }}</div>
                  <div class="text-slate small mb-1">{{ pkg.description }}</div>
                  <div class="text-mono small text-slate">
                    {{ pkg.items.map((item) => item.name).join(', ') || '—' }}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="card-sb mt-3">
          <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div class="card-title mb-0">Pilih Alat Individual</div>
            <div class="d-flex gap-2">
              <select
                v-model="categoryFilter"
                class="form-select form-select-sm"
                style="max-width: 180px"
                data-testid="asset-category-filter"
              >
                <option value="">— Semua Kategori —</option>
                <option v-for="cat in options.categories" :key="cat.id" :value="String(cat.id)">
                  {{ cat.name }}
                </option>
              </select>
              <input
                v-model="assetSearch"
                type="search"
                class="form-control form-control-sm"
                placeholder="Cari alat..."
                style="max-width: 220px"
                data-testid="asset-search"
              />
            </div>
          </div>

          <div style="max-height: 400px; overflow-y: auto" data-testid="asset-list">
            <label
              v-for="asset in visibleAssets"
              :key="asset.id"
              class="d-flex gap-2 align-items-center p-2 border-bottom"
            >
              <input
                v-model="selectedAssets"
                type="checkbox"
                :value="asset.id"
                class="form-check-input"
                :disabled="asset.status !== 'Available'"
                :data-testid="`asset-${asset.id}`"
              />
              <img
                :src="photoUrl(asset.photo_url)"
                :alt="`Foto ${asset.name}`"
                class="rounded"
                style="
                  width: 52px;
                  height: 52px;
                  object-fit: cover;
                  border: 1px solid var(--sb-line);
                  background: #fff;
                  flex-shrink: 0;
                "
                :data-testid="`asset-photo-${asset.id}`"
              />
              <div class="flex-grow-1">
                <div class="fw-semibold small">{{ asset.name }}</div>
                <div class="text-slate small text-mono">{{ asset.asset_code }}</div>
                <div v-if="asset.category_name" class="text-slate small">
                  {{ asset.category_name }}
                </div>
                <div v-if="asset.brand || asset.model" class="text-slate small">
                  {{ [asset.brand, asset.model].filter(Boolean).join(' ') }}
                </div>
                <div v-if="asset.serial_number" class="text-slate small text-mono">
                  SN: {{ asset.serial_number }}
                </div>
              </div>

              <div v-if="asset.unit" class="text-center" style="flex-shrink: 0">
                <span class="badge bg-info text-dark" :data-testid="`loan-stock-${asset.id}`">
                  <i class="fa-solid fa-layer-group"></i> Stok: {{ stockLabel(asset) }}
                </span>
              </div>

              <div class="text-center" style="flex-shrink: 0">
                <StatusBadge :status="asset.status" :label="asset.status_label" />
              </div>

              <div
                v-if="options.holders[asset.id]?.length"
                class="small text-slate"
                style="min-width: 150px; max-width: 210px; flex-shrink: 0"
              >
                <div>
                  <span class="text-slate">Pemesan:</span>
                  {{ options.holders[asset.id]!.join(', ') }}
                </div>
                <div v-if="options.followers[asset.id]?.length" style="font-size: 11px">
                  <span class="text-slate">Terlibat:</span>
                  {{ options.followers[asset.id]!.join(', ') }}
                </div>
              </div>
            </label>

            <div v-if="!visibleAssets.length" class="text-slate small text-center py-3">
              Tidak ada alat yang cocok dengan pencarian.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-end mt-3">
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="submitting"
        data-testid="btn-submit-loan"
      >
        <i class="fa-solid fa-paper-plane"></i>
        {{ submitting ? 'Mengirim…' : 'Submit Pengajuan' }}
      </button>
    </div>
  </form>
</template>
