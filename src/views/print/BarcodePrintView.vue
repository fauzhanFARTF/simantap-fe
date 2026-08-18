<script setup lang="ts">
/**
 * Label QR alat -- satu alat, satu halaman penuh saat dicetak.
 *
 * QR digambar dari `barcode` (jatuh ke `bmn_number` bila kosong) — nilai yang
 * sama persis dengan yang dibaca saat penyerahan/pengembalian, sehingga label
 * dan pemindai tidak pernah berbeda pendapat.
 */
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { assetApi } from '@/api'
import type { AssetSlim } from '@/types/models'

const APP_NAME = 'SIMANTAP — Diskominfo Kab. Tangerang'

const route = useRoute()

const assets = ref<AssetSlim[]>([])
const qrCodes = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')

const codeOf = (asset: AssetSlim) => asset.barcode || asset.bmn_number

const printPage = () => window.print()
const closeWindow = () => window.close()

onMounted(async () => {
  const uuids = String(route.query.uuids ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!uuids.length) {
    error.value = 'Pilih minimal satu alat untuk dicetak barcode-nya.'
    loading.value = false
    return
  }

  try {
    assets.value = (await assetApi.barcodeBatch(uuids)).results

    // qrcode diimpor dinamis: hanya halaman ini yang membutuhkannya.
    const QRCode = (await import('qrcode')).default
    for (const asset of assets.value) {
      qrCodes.value[asset.uuid] = await QRCode.toDataURL(codeOf(asset), {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
    }
  } catch {
    error.value = 'Gagal memuat data alat.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="toolbar no-print">
    <div class="hint">
      <i class="fa-solid fa-circle-info"></i>&nbsp; {{ assets.length }} label QR siap dicetak,
      satu alat per halaman.
    </div>
    <button class="btn btn-primary" data-testid="btn-print" @click="printPage">
      <i class="fa-solid fa-print"></i> Cetak
    </button>
    <button class="btn btn-outline-navy" @click="closeWindow">Tutup</button>
  </div>

  <div v-if="loading" class="text-center text-slate py-5">Menyiapkan label…</div>
  <div v-else-if="error" class="alert alert-danger m-4">{{ error }}</div>

  <div v-else data-testid="barcode-grid">
    <div v-for="asset in assets" :key="asset.uuid" class="qr-page">
      <div class="qr-page-head">
        <div class="lbl-org">{{ APP_NAME }}</div>
        <div class="lbl-name">{{ asset.name }}</div>
      </div>

      <div class="lbl-qr">
        <img
          v-if="qrCodes[asset.uuid]"
          :src="qrCodes[asset.uuid]"
          :alt="`QR ${codeOf(asset)}`"
        />
      </div>

      <div class="lbl-code-text">{{ codeOf(asset) }}</div>
      <div class="lbl-foot">Pindai QR dengan kamera HP atau alat pemindai QR</div>
    </div>
  </div>
</template>

<style>
/* Tidak di-scope: halaman cetak ini menguasai seluruh dokumen, sama seperti
   template cetak aplikasi lain yang berdiri sendiri di luar layout. */
body {
  background: #eef2f8;
}

.toolbar {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
}

.toolbar .hint {
  margin-right: auto;
  color: var(--sb-ink-2);
  font-size: 13px;
}

.qr-page {
  max-width: 720px;
  margin: 0 auto 24px;
  background: #fff;
  padding: 48px 40px;
}

.qr-page-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 40px;
}

.qr-page-head .lbl-org {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sb-ink-3);
  font-weight: 700;
  white-space: nowrap;
}

.qr-page-head .lbl-name {
  font-size: 26px;
  font-weight: 800;
  color: var(--sb-ink);
  text-transform: uppercase;
  text-align: right;
  line-height: 1.15;
}

.qr-page .lbl-qr {
  display: flex;
  justify-content: center;
  margin: 6px 0 36px;
}

.qr-page .lbl-qr img {
  width: 300px !important;
  height: 300px !important;
}

.qr-page .lbl-code-text {
  font-size: 19px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--sb-ink);
  text-align: center;
}

.qr-page .lbl-foot {
  font-size: 13px;
  color: var(--sb-ink-3);
  text-align: center;
  margin-top: 10px;
}

/* Satu alat, satu halaman -- baris berikutnya selalu mulai halaman baru. */
.qr-page + .qr-page {
  page-break-before: always;
  break-before: page;
}

@media print {
  @page {
    size: A4;
    margin: 18mm;
  }

  body {
    background: #fff;
  }

  .qr-page {
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
}
</style>
