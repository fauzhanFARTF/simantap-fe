<script setup lang="ts">
/**
 * Pengembalian alat.
 *
 * Kondisi (Baik / Rusak / Hilang) dipilih LEBIH DULU, baru QR dipindai — itu
 * urutan kerja di meja gudang: petugas memeriksa barangnya, memutuskan, lalu
 * menembak QR-nya.
 *
 * Alat berstok (kabel meteran, RJ45 bungkusan) tidak memakai pilihan itu:
 * petugas mengisi SISA yang kembali, dan sistem yang menghitung terpakainya.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { checkinApi, superadminApi } from '@/api'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/common/PageHeader.vue'
import BorrowedItemsCard from '@/components/loans/BorrowedItemsCard.vue'
import ScannerPanel from '@/components/scanner/ScannerPanel.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { BorrowedItem, LoanDetail, LoanItem, ReturnCondition } from '@/types/models'
import { barcodeCandidates } from '@/utils/barcode'
import { fmtRupiah, fmtStock } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const uuid = String(route.params.uuid)
const panel = ref<InstanceType<typeof ScannerPanel> | null>(null)

const condition = ref<ReturnCondition>('Good')
const damageNote = ref('')
const sisa = ref('')
const manualCode = ref('')

const { data, loading, error, run } = useAsync<{
  loan: LoanDetail | null
  items: LoanItem[]
  borrowed_items: BorrowedItem[]
}>(() => checkinApi.detail(uuid), { loan: null, items: [], borrowed_items: [] })

const loan = computed(() => data.value.loan)
const items = computed(() => data.value.items)

/** Alat berstok pada peminjaman ini, diindeks per kandidat barcode. */
const stockByBarcode = computed(() => {
  const map = new Map<string, LoanItem>()
  for (const item of items.value) {
    if (!item.unit) continue
    for (const candidate of barcodeCandidates(item.barcode)) {
      map.set(candidate.toUpperCase(), item)
    }
  }
  return map
})

/** Alat berstok yang cocok dengan kode yang sedang diketik. */
const stockItem = computed(() => {
  const code = manualCode.value.trim().toUpperCase()
  if (!code) return null
  for (const candidate of barcodeCandidates(code)) {
    const hit = stockByBarcode.value.get(candidate.toUpperCase())
    if (hit) return hit
  }
  return null
})

const noteLabel = computed(() =>
  condition.value === 'Lost' ? 'Keterangan Kehilangan (wajib)' : 'Keluhan Kerusakan (wajib)',
)

const doneStatuses = new Set([
  'ReturnedGood', 'ReturnedDamaged', 'ReturnedLost', 'InRepair', 'Restored',
])
const isDone = (item: LoanItem) => doneStatuses.has(item.item_status)
const isBad = (item: LoanItem) =>
  item.item_status === 'ReturnedDamaged' || item.item_status === 'InRepair'
const isLost = (item: LoanItem) => item.item_status === 'ReturnedLost'

function rowClass(item: LoanItem) {
  if (!isDone(item)) return ''
  if (isLost(item)) return 'lost'
  return isBad(item) ? 'damaged' : 'done'
}

async function handleScan(code: string) {
  try {
    const result = await checkinApi.scan(uuid, {
      barcode: code,
      condition: condition.value,
      damage_note: damageNote.value,
      sisa: sisa.value || undefined,
    })
    panel.value?.log(`OK · ${result.message}`, 'ok')
    ui.success(result.message)

    // Bersihkan isian sekali-pakai supaya tidak terbawa ke alat berikutnya.
    damageNote.value = ''
    sisa.value = ''
    await run()
  } catch (exception) {
    const message = exception instanceof ApiError ? exception.message : 'Gagal memproses.'
    panel.value?.log(`GAGAL · ${message}`, 'err')
    ui.error(message)
  }
}

async function undo(item: LoanItem) {
  const confirmed = await confirmAction(
    `Batalkan pengembalian "${item.asset_name}"? Alat kembali berstatus Dipinjam dan tiket ` +
      'perbaikannya (bila ada) dihapus.',
  )
  if (!confirmed) return
  if (await runAction(() => superadminApi.undoCheckin(item.id))) await run()
}

async function finalize() {
  if (!(await confirmAction('Selesaikan pengembalian?'))) return
  if (await runAction(() => checkinApi.finalize(uuid))) await router.push(`/loans/${uuid}`)
}

onMounted(run)
</script>

<template>
  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat data pengembalian…</div>
  <div v-else-if="error || !loan" class="alert alert-danger">
    {{ error ?? 'Peminjaman tidak ditemukan.' }}
  </div>

  <template v-else>
    <PageHeader :title="`Pengembalian — ${loan.loan_code}`">
      <template #actions>
        <RouterLink to="/checkin" class="btn btn-outline-navy">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </RouterLink>
        <button class="btn btn-primary" data-testid="btn-finalize-checkin" @click="finalize">
          <i class="fa-solid fa-flag-checkered"></i> Selesai Pengembalian
        </button>
      </template>
    </PageHeader>
    <p class="subtitle" style="margin-top: -14px">
      Pemohon: <strong>{{ loan.requester_name }}</strong> · Acara: {{ loan.event_name }}
    </p>

    <div class="row g-3">
      <div class="col-lg-7">
        <ScannerPanel
          ref="panel"
          v-model:manual="manualCode"
          hint="Buka halaman ini di <strong>HP</strong> untuk pindai pakai kamera, atau hubungkan <strong>alat pemindai QR (2D scanner USB/Bluetooth)</strong> ke komputer — cukup arahkan kursor ke kolom di bawah lalu tembak QR-nya."
          intro-log="Pilih kondisi, lalu scan QR alat yang kembali."
          @scan="handleScan"
        >
          <template #controls>
            <div class="mb-3">
              <label class="form-label text-slate small">Kondisi setelah kembali</label>
              <div class="btn-group w-100">
                <input
                  id="condGood"
                  v-model="condition"
                  type="radio"
                  class="btn-check"
                  value="Good"
                  data-testid="radio-good"
                />
                <label class="btn btn-outline-success" for="condGood">
                  <i class="fa-solid fa-circle-check"></i> Baik
                </label>

                <input
                  id="condDamaged"
                  v-model="condition"
                  type="radio"
                  class="btn-check"
                  value="Damaged"
                  data-testid="radio-damaged"
                />
                <label class="btn btn-outline-danger" for="condDamaged">
                  <i class="fa-solid fa-triangle-exclamation"></i> Rusak
                </label>

                <input
                  id="condLost"
                  v-model="condition"
                  type="radio"
                  class="btn-check"
                  value="Lost"
                  data-testid="radio-lost"
                />
                <label class="btn btn-outline-dark" for="condLost">
                  <i class="fa-solid fa-circle-question"></i> Hilang
                </label>
              </div>
            </div>

            <div v-if="condition !== 'Good'" class="mb-3">
              <label class="form-label text-slate small" for="damageNote">{{ noteLabel }}</label>
              <textarea
                id="damageNote"
                v-model="damageNote"
                class="form-control"
                rows="2"
                placeholder="mis. Layar LCD retak, lensa berjamur..."
                data-testid="input-damage-note"
              ></textarea>
            </div>

            <div v-if="stockItem" class="mb-3" data-testid="sisa-wrap">
              <label class="form-label text-slate small" for="sisaInput">
                Sisa stok yang kembali
              </label>
              <div class="input-group">
                <input
                  id="sisaInput"
                  v-model="sisa"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control"
                  placeholder="mis. 250"
                  data-testid="input-sisa"
                />
                <span class="input-group-text">{{ stockItem.unit }}</span>
              </div>
              <div class="form-text">
                Alat berstok — isi berapa yang kembali dari
                {{ fmtStock(stockItem.qty_current, stockItem.unit) }} yang keluar. Kosong (0)
                berarti habis pakai.
              </div>
            </div>

            <div
              v-if="condition === 'Lost'"
              class="alert alert-dark d-flex align-items-center gap-2 py-2"
              data-testid="lost-value-hint"
            >
              <i class="fa-solid fa-circle-info"></i>
              <span>
                Nilai aset akan ditampilkan otomatis (harga dulu &amp; nilai sekarang) setelah QR
                di-scan, untuk acuan ganti rugi.
              </span>
            </div>
          </template>
        </ScannerPanel>
      </div>

      <div class="col-lg-5">
        <div class="card-sb">
          <div class="card-title">Progress Alat ({{ items.length }})</div>
          <div data-testid="item-progress-list">
            <div
              v-for="item in items"
              :key="item.id"
              class="item-progress"
              :class="rowClass(item)"
              :data-testid="`item-${item.id}`"
            >
              <div>
                <div class="fw-semibold">{{ item.asset_name }}</div>
                <div class="text-slate small text-mono">{{ item.bmn_number }}</div>
                <div class="text-slate small">
                  Dulu: {{ fmtRupiah(item.purchase_price) }} · Sekarang:
                  {{ fmtRupiah(item.current_value) }}
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span v-if="item.item_status === 'CheckedOut'" class="badge bg-warning text-dark">
                  Menunggu
                </span>
                <span v-else-if="isLost(item)" class="badge bg-dark">Hilang</span>
                <span v-else-if="isBad(item)" class="badge bg-danger">Rusak</span>
                <span v-else-if="isDone(item)" class="badge bg-success">Baik</span>
                <span v-else class="badge bg-secondary">{{ item.item_status_label }}</span>

                <button
                  v-if="isDone(item) && auth.isSuperadmin"
                  class="btn btn-sm btn-outline-danger"
                  title="Batalkan pengembalian (Super Admin)"
                  :data-testid="`btn-undo-checkin-${item.id}`"
                  @click="undo(item)"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <BorrowedItemsCard
        :items="data.borrowed_items"
        title="Alat yang Masih Dipinjam Orang Ini"
        subtitle="Alat dari peminjaman LAIN yang masih dipegang penanggung jawab / personel peminjaman ini dan belum dikembalikan."
        empty-text="Tidak ada tanggungan alat lain dari penanggung jawab maupun personel peminjaman ini."
      />
    </div>
  </template>
</template>
