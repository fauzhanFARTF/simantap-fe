<script setup lang="ts">
/**
 * SPK Perbaikan — surat perintah kerja fisik untuk teknisi.
 *
 * Memuat halaman ini menandai tiket sebagai "SPK Dicetak" di server (idempotent),
 * jadi statusnya jujur mengikuti kenyataan tanpa langkah manual tambahan.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { repairApi } from '@/api'
import type { RepairDetail } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const route = useRoute()
const uuid = String(route.params.uuid)

const repair = ref<RepairDetail | null>(null)
const loading = ref(true)
const error = ref('')

const brandModel = computed(
  () => [repair.value?.brand, repair.value?.model].filter(Boolean).join(' ') || '—',
)
const printedAt = computed(() => repair.value?.form_printed_at ?? new Date().toISOString())

const printPage = () => window.print()
const closeWindow = () => window.close()

onMounted(async () => {
  try {
    repair.value = await repairApi.printForm(uuid)
    // Dialog cetak dibuka sendiri, sama seperti `body onload="window.print()"`
    // di template lama — petugas gudang menekan Cetak SPK lalu langsung memilih
    // printer, tanpa satu klik tambahan.
    setTimeout(printPage, 400)
  } catch {
    error.value = 'Dokumen tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-center text-slate py-5">Menyiapkan SPK…</div>
  <div v-else-if="error || !repair" class="alert alert-danger m-4">
    {{ error || 'Data perbaikan tidak ditemukan.' }}
  </div>

  <template v-else>
    <div class="no-print" style="text-align: right; padding: 16px">
      <button class="btn btn-primary" data-testid="btn-print" @click="printPage">
        <i class="fa-solid fa-print"></i> Cetak
      </button>
      <button class="btn btn-outline-navy" @click="closeWindow">Tutup</button>
    </div>

    <div class="spk-page" data-testid="repair-spk">
      <div class="header">
        <div class="sub">PEMERINTAH KABUPATEN TANGERANG</div>
        <h1>DINAS KOMUNIKASI DAN INFORMATIKA</h1>
        <h2>Formulir Perbaikan Alat (SPK) — Aset BMN</h2>
        <div class="sub">Smart Building — Diskominfo Kabupaten Tangerang</div>
      </div>

      <table>
        <tbody>
          <tr><td>No. SPK</td><td class="text-mono">{{ repair.repair_code }}</td></tr>
          <tr><td>Tanggal Cetak</td><td>{{ fmtDateTime(printedAt) }}</td></tr>
          <tr><td>Nama Alat</td><td><strong>{{ repair.asset_name }}</strong></td></tr>
          <tr><td>Kode Aset</td><td class="text-mono">{{ repair.asset_code }}</td></tr>
          <tr><td>Nomor BMD</td><td class="text-mono">{{ repair.bmn_number }}</td></tr>
          <tr><td>Brand / Model</td><td>{{ brandModel }}</td></tr>
          <tr>
            <td>Serial Number</td>
            <td class="text-mono">{{ repair.serial_number || '—' }}</td>
          </tr>
          <tr>
            <td>Kode Peminjaman Sumber</td>
            <td class="text-mono">{{ repair.loan_code || '—' }}</td>
          </tr>
          <tr>
            <td>Pemohon Terakhir</td>
            <td>
              {{ repair.requester_name || '—'
              }}<template v-if="repair.requester_unit"> — {{ repair.requester_unit }}</template>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight: 600; margin-bottom: 6px">Keluhan / Kerusakan Awal:</div>
      <div class="complaint-box" style="white-space: pre-line">{{ repair.complaint }}</div>

      <div style="font-weight: 600; margin-bottom: 6px">
        Tindakan Perbaikan (diisi Teknisi):
      </div>
      <div class="action-box">&nbsp;</div>

      <div class="signatures">
        <div class="box">
          <div>Diserahkan oleh,<br /><strong>Admin Gudang</strong></div>
          <div class="space"></div>
          <div class="name">(…………………………………)</div>
        </div>
        <div class="box">
          <div>Diperbaiki oleh,<br /><strong>Teknisi</strong></div>
          <div class="space"></div>
          <div class="name">(…………………………………)</div>
        </div>
      </div>

      <div style="margin-top: 30px; font-size: 11px; color: #64748b">
        Formulir ini merupakan Surat Perintah Kerja (SPK) fisik untuk proses perbaikan. Setelah
        selesai, teknisi wajib mengisi <em>Tindakan Perbaikan</em>, menandatangani, dan
        mengembalikan alat + formulir ini ke Admin Gudang untuk pembaruan status pada sistem.
      </div>
    </div>
  </template>
</template>
