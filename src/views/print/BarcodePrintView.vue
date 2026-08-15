<script setup lang="ts">
/**
 * Lembar stiker QR alat, siap gunting & tempel.
 *
 * QR digambar dari `barcode` (jatuh ke `bmn_number` bila kosong) — nilai yang
 * sama persis dengan yang dibaca saat penyerahan/pengembalian, sehingga stiker
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
        width: 160,
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
      <i class="fa-solid fa-circle-info"></i>&nbsp; {{ assets.length }} label QR siap dicetak.
      Gunakan kertas label/sticker atau kertas biasa lalu gunting sesuai garis putus-putus.
    </div>
    <button class="btn btn-primary" data-testid="btn-print" @click="printPage">
      <i class="fa-solid fa-print"></i> Cetak
    </button>
    <button class="btn btn-outline-navy" @click="closeWindow">Tutup</button>
  </div>

  <div v-if="loading" class="text-center text-slate py-5">Menyiapkan label…</div>
  <div v-else-if="error" class="alert alert-danger m-4">{{ error }}</div>

  <div v-else class="label-sheet" data-testid="barcode-grid">
    <div v-for="asset in assets" :key="asset.uuid" class="qr-label">
      <div class="lbl-org">{{ APP_NAME }}</div>
      <div class="lbl-name">{{ asset.name }}</div>
      <div class="lbl-bmn">BMN: {{ asset.bmn_number }} · {{ asset.asset_code }}</div>
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
   template cetak aplikasi lama yang berdiri sendiri di luar layout. */
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

.label-sheet {
  max-width: 900px;
  margin: 0 auto 40px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.qr-label {
  background: #fff;
  border: 1.5px dashed #b9c3d4;
  border-radius: 10px;
  padding: 18px 14px;
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}

.qr-label .lbl-org {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 700;
}

.qr-label .lbl-name {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 4px 0 2px;
  line-height: 1.25;
  min-height: 38px;
}

.qr-label .lbl-bmn {
  font-size: 12px;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 10px;
}

.qr-label .lbl-qr {
  display: flex;
  justify-content: center;
  margin: 6px 0;
}

.qr-label .lbl-qr img {
  width: 160px !important;
  height: 160px !important;
}

.qr-label .lbl-code-text {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #0f172a;
  margin: 8px 0 4px;
}

.qr-label .lbl-foot {
  font-size: 9.5px;
  color: #94a3b8;
  margin-top: 6px;
}

@media print {
  @page {
    size: A4;
    margin: 10mm;
  }

  body {
    background: #fff;
  }

  .label-sheet {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    max-width: 100%;
  }

  .qr-label {
    border-style: solid;
    border-color: #d9dfe9;
  }
}
</style>
