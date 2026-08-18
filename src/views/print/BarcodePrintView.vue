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
import logo from '@/assets/img/logo-kominfo-icon.png'
import type { AssetSlim } from '@/types/models'

const route = useRoute()

const assets = ref<AssetSlim[]>([])
const qrCodes = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')

const codeOf = (asset: AssetSlim) => asset.barcode || asset.bmn_number
const brandModelOf = (asset: AssetSlim) => [asset.brand, asset.model].filter(Boolean).join(' ') || '—'

const printPage = () => window.print()
const closeWindow = () => window.close()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * QR dengan logo aplikasi di tengah. `errorCorrectionLevel: 'H'` (tahan ~30%
 * area tertutup) WAJIB dipakai di sini -- tanpanya logo bisa membuat QR gagal
 * dipindai karena menutup modul data yang dibutuhkan.
 */
async function renderQrWithLogo(text: string, QRCode: typeof import('qrcode')) {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, text, { width: 320, margin: 1, errorCorrectionLevel: 'H' })

  const ctx = canvas.getContext('2d')
  if (ctx) {
    const logoImg = await loadImage(logo)
    const box = canvas.width * 0.22
    const x = (canvas.width - box) / 2
    const y = (canvas.height - box) / 2
    const pad = box * 0.12

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, box, box)
    ctx.drawImage(logoImg, x + pad, y + pad, box - pad * 2, box - pad * 2)
  }

  return canvas.toDataURL('image/png')
}

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
      qrCodes.value[asset.uuid] = await renderQrWithLogo(codeOf(asset), QRCode)
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
      <div class="lbl-code-text">{{ codeOf(asset) }}</div>

      <div class="lbl-qr">
        <img
          v-if="qrCodes[asset.uuid]"
          :src="qrCodes[asset.uuid]"
          :alt="`QR ${codeOf(asset)}`"
        />
      </div>

      <div class="lbl-brand-model">{{ brandModelOf(asset) }}</div>
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
  max-width: 560px;
  margin: 0 auto 24px;
  background: #fff;
  padding: 64px 40px;
  text-align: center;
}

.qr-page .lbl-code-text {
  font-size: 18px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--sb-ink);
  margin-bottom: 28px;
}

.qr-page .lbl-qr {
  display: flex;
  justify-content: center;
  margin-bottom: 28px;
}

.qr-page .lbl-qr img {
  width: 300px !important;
  height: 300px !important;
}

.qr-page .lbl-brand-model {
  font-size: 18px;
  font-weight: 700;
  color: var(--sb-ink-2);
  text-transform: uppercase;
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
