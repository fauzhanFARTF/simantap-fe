<script setup lang="ts">
/** Penyerahan alat: pindai QR tiap alat, lalu tutup dengan finalisasi. */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { checkoutApi, superadminApi } from '@/api'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/common/PageHeader.vue'
import BorrowedItemsCard from '@/components/loans/BorrowedItemsCard.vue'
import ScannerPanel from '@/components/scanner/ScannerPanel.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { BorrowedItem, LoanDetail, LoanItem } from '@/types/models'
import { photoUrl } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const uuid = String(route.params.uuid)
const panel = ref<InstanceType<typeof ScannerPanel> | null>(null)

const { data, loading, error, run } = useAsync<{
  loan: LoanDetail | null
  items: LoanItem[]
  borrowed_items: BorrowedItem[]
}>(() => checkoutApi.detail(uuid), { loan: null, items: [], borrowed_items: [] })

const loan = computed(() => data.value.loan)
const items = computed(() => data.value.items)

/** Barang yang sudah keluar gudang — 'Di OPD' termasuk, itu penyerahan permanen. */
const isDone = (item: LoanItem) =>
  item.item_status === 'CheckedOut' || item.item_status === 'AtOpd'

async function handleScan(code: string) {
  try {
    const result = await checkoutApi.scan(uuid, code)
    panel.value?.log(`OK · ${result.message}`, 'ok')
    ui.success(`Penyerahan: ${result.asset_name}`)
    await run()
  } catch (exception) {
    const message = exception instanceof ApiError ? exception.message : 'Gagal memproses.'
    panel.value?.log(`GAGAL · ${message}`, 'err')
    ui.error(message)
  }
}

async function undo(item: LoanItem) {
  const confirmed = await confirmAction(
    `Batalkan penyerahan "${item.asset_name}"? Alat kembali berstatus Dipesan dan harus ` +
      'discan ulang.',
  )
  if (!confirmed) return
  if (await runAction(() => superadminApi.undoCheckout(item.id))) await run()
}

async function finalize() {
  if (!(await confirmAction('Selesaikan penyerahan untuk peminjaman ini?'))) return
  if (await runAction(() => checkoutApi.finalize(uuid))) await router.push(`/loans/${uuid}`)
}

onMounted(run)
</script>

<template>
  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat data penyerahan…</div>
  <div v-else-if="error || !loan" class="alert alert-danger">
    {{ error ?? 'Peminjaman tidak ditemukan.' }}
  </div>

  <template v-else>
    <PageHeader :title="`Scan Penyerahan — ${loan.loan_code}`">
      <template #actions>
        <RouterLink to="/checkout" class="btn btn-outline-navy">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </RouterLink>
        <button class="btn btn-primary" data-testid="btn-finalize-checkout" @click="finalize">
          <i class="fa-solid fa-flag-checkered"></i> Selesai Penyerahan
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
          hint="Buka halaman ini di <strong>HP</strong> untuk pindai pakai kamera, atau hubungkan <strong>alat pemindai QR (2D scanner USB/Bluetooth)</strong> ke komputer — cukup arahkan kursor ke kolom di bawah lalu tembak QR-nya."
          intro-log="Arahkan kamera ke QR code pada alat. Sistem otomatis memproses penyerahan setiap alat yang terdaftar dalam peminjaman ini."
          @scan="handleScan"
        />
      </div>

      <div class="col-lg-5">
        <div class="card-sb">
          <div class="card-title">Progress Alat ({{ items.length }})</div>
          <div data-testid="item-progress-list">
            <div
              v-for="item in items"
              :key="item.id"
              class="item-progress"
              :class="{ done: isDone(item) }"
              :data-testid="`item-${item.id}`"
            >
              <div class="d-flex align-items-center gap-2">
                <img
                  :src="photoUrl(item.photo_url)"
                  :alt="`Foto ${item.asset_name}`"
                  style="
                    width: 40px;
                    height: 40px;
                    object-fit: cover;
                    border-radius: 8px;
                    border: 1px solid var(--sb-line);
                    background: #fff;
                  "
                />
                <div>
                  <div class="fw-semibold">{{ item.asset_name }}</div>
                  <div class="text-slate small text-mono">{{ item.bmn_number }}</div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <template v-if="isDone(item)">
                  <span class="badge bg-success"><i class="fa-solid fa-check"></i> Sudah</span>
                  <button
                    v-if="auth.isSuperadmin"
                    class="btn btn-sm btn-outline-danger"
                    title="Batalkan penyerahan (Super Admin)"
                    :data-testid="`btn-undo-checkout-${item.id}`"
                    @click="undo(item)"
                  >
                    <i class="fa-solid fa-rotate-left"></i>
                  </button>
                </template>
                <span v-else class="badge bg-warning text-dark">Belum</span>
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
