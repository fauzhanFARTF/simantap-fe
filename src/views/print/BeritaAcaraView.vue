<script setup lang="ts">
/**
 * Berita Acara — dokumen resmi, dicetak.
 *
 * Jenis dokumennya ditentukan server (`document`), bukan ditebak di sini:
 *  - `berita_acara` — peminjaman acara. Dua halaman: berita acara + lembar
 *    periksa yang dibawa petugas ke lokasi.
 *  - `bast_opd` — serah terima barang antar-instansi. Satu halaman, dengan
 *    keterangan per barang (dikembalikan / tetap di OPD).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { loanApi } from '@/api'
import logo from '@/assets/img/logo-kominfo-icon.png'
import { useAuthStore } from '@/stores/auth'
import type { LoanDetail, LoanItem } from '@/types/models'
import { fmtDate, fmtTime } from '@/utils/format'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const route = useRoute()
const auth = useAuthStore()
const uuid = String(route.params.uuid)

const loan = ref<LoanDetail | null>(null)
const documentType = ref<'berita_acara' | 'bast_opd'>('berita_acara')
const requesterPhone = ref<string | null>(null)
const loading = ref(true)
const error = ref('')

const isOpd = computed(() => documentType.value === 'bast_opd')
const items = computed<LoanItem[]>(() => loan.value?.items ?? [])

/** "15 Agustus 2026" — format tanggal panjang untuk dokumen resmi. */
function longDate(value?: string | null): string {
  const date = value ? new Date(value.replace(' ', 'T')) : new Date()
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  return `${safe.getDate()} ${MONTHS[safe.getMonth()]} ${safe.getFullYear()}`
}

/** Cap waktu cetak di kaki dokumen. */
const printedStamp = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
})

/**
 * Tanggal serah terima OPD = saat barang keluar gudang, bukan tanggal
 * pengajuan. Bila belum diserahkan, dipakai tanggal hari ini.
 */
const serahTanggal = computed(() => longDate(loan.value?.checkout_at))

const returningItems = computed(() => items.value.filter((item) => item.will_return))
const stayingItems = computed(() => items.value.filter((item) => !item.will_return))
const statusBarang = computed(() => {
  const parts: string[] = []
  if (returningItems.value.length) parts.push(`${returningItems.value.length} barang dikembalikan`)
  if (stayingItems.value.length) parts.push(`${stayingItems.value.length} barang tetap di OPD`)
  return parts.join(', ') || '—'
})

const brandModel = (item: LoanItem) =>
  [item.brand, item.model].filter(Boolean).join(' ') || '—'

const printPage = () => window.print()
const closeWindow = () => window.close()

onMounted(async () => {
  try {
    const result = await loanApi.beritaAcara(uuid)
    loan.value = result.loan
    documentType.value = result.document
    requesterPhone.value = result.requester_phone
    // Dialog cetak dibuka sendiri, sama seperti `body onload="window.print()"`
    // pada template lama.
    setTimeout(printPage, 400)
  } catch {
    error.value = 'Dokumen tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-center text-slate py-5">Menyiapkan dokumen…</div>
  <div v-else-if="error || !loan" class="alert alert-danger m-4">
    {{ error || 'Peminjaman tidak ditemukan.' }}
  </div>

  <template v-else>
    <div class="no-print" style="text-align: right; padding: 16px; max-width: 820px; margin: 0 auto">
      <button class="btn btn-primary" data-testid="btn-print" @click="printPage">
        <i class="fa-solid fa-print"></i> Cetak / Simpan PDF
      </button>
      <button class="btn btn-outline-navy" @click="closeWindow">Tutup</button>
    </div>

    <!-- ── Halaman 1 ──────────────────────────────────────────────────────── -->
    <div class="ba-page" data-testid="berita-acara">
      <div class="ba-head">
        <img :src="logo" alt="Logo" class="logo" />
        <div class="sub">PEMERINTAH KABUPATEN TANGERANG</div>
        <h1>DINAS KOMUNIKASI DAN INFORMATIKA</h1>
        <div class="sub">Smart Building — Diskominfo Kabupaten Tangerang</div>
      </div>

      <div class="ba-title">
        <h2>{{ isOpd ? 'BERITA ACARA SERAH TERIMA BARANG' : 'BERITA ACARA PEMINJAMAN / KELUAR ALAT' }}</h2>
        <div class="no">Nomor: {{ loan.loan_code }}</div>
      </div>

      <p v-if="isOpd" style="margin: 12px 0">
        Pada hari ini, <strong>{{ serahTanggal }}</strong
        >, telah dilakukan serah terima barang milik daerah dari
        <strong>Dinas Komunikasi dan Informatika Kabupaten Tangerang</strong> kepada instansi
        penerima berikut:
      </p>
      <p v-else style="margin: 12px 0">
        Pada hari ini, <strong>{{ longDate() }}</strong
        >, telah dilakukan serah terima peminjaman (keluar) alat inventaris BMN dengan rincian
        sebagai berikut:
      </p>

      <table class="ba-meta">
        <tbody v-if="isOpd">
          <tr>
            <td>Instansi Penerima (OPD)</td>
            <td>: <strong>{{ loan.event_name }}</strong></td>
          </tr>
          <tr>
            <td>Penanggungjawab (Diskominfo)</td>
            <td>
              : <strong>{{ loan.requester_name }}</strong
              ><template v-if="loan.requester_unit"> — {{ loan.requester_unit }}</template
              ><template v-if="requesterPhone"> ({{ requesterPhone }})</template>
            </td>
          </tr>
          <tr v-if="loan.participants.length">
            <td>Personel Instalasi</td>
            <td>: {{ loan.participants.join(', ') }}</td>
          </tr>
          <tr v-if="loan.purpose">
            <td>Tujuan / Keperluan</td>
            <td style="white-space: pre-line">: {{ loan.purpose }}</td>
          </tr>
          <tr>
            <td>Tanggal Serah Terima</td>
            <td>: {{ serahTanggal }}</td>
          </tr>
          <tr>
            <td>Status Barang</td>
            <td>: <strong>{{ statusBarang }}</strong></td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr>
            <td>Nama Acara</td>
            <td>: <strong>{{ loan.event_name }}</strong></td>
          </tr>
          <tr>
            <td>Lokasi Acara</td>
            <td>: {{ loan.event_location || '—' }}</td>
          </tr>
          <tr>
            <td>Tanggal Kegiatan</td>
            <td>: {{ fmtDate(loan.start_date) }} s/d {{ fmtDate(loan.end_date) }}</td>
          </tr>
          <tr v-if="loan.start_time">
            <td>Jam Acara</td>
            <td>: {{ fmtTime(loan.start_time) }} WIB</td>
          </tr>
          <tr>
            <td>Peminjam (Penanggungjawab)</td>
            <td>
              : <strong>{{ loan.requester_name }}</strong
              ><template v-if="loan.requester_unit"> — {{ loan.requester_unit }}</template
              ><template v-if="requesterPhone"> ({{ requesterPhone }})</template>
            </td>
          </tr>
          <tr v-if="loan.participants.length">
            <td>Personel yang Terlibat</td>
            <td>: {{ loan.participants.join(', ') }}</td>
          </tr>
          <tr v-if="loan.purpose">
            <td>Tujuan / Keperluan</td>
            <td style="white-space: pre-line">: {{ loan.purpose }}</td>
          </tr>
        </tbody>
      </table>

      <table class="items">
        <thead>
          <tr>
            <th style="width: 32px">No</th>
            <th>{{ isOpd ? 'Nama Barang' : 'Nama Alat' }}</th>
            <th>Kode Aset</th>
            <th>No. DISKOMINFO</th>
            <th>Brand / Model</th>
            <th>Serial Number</th>
            <th v-if="isOpd" style="width: 90px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.asset_name }}</td>
            <td>{{ item.asset_code }}</td>
            <td>{{ item.bmn_number }}</td>
            <td>{{ brandModel(item) }}</td>
            <td>{{ item.serial_number || '—' }}</td>
            <td v-if="isOpd">
              <span v-if="item.will_return" class="tag-pp">
                Dikembalikan
                <template v-if="item.expected_return_date">
                  {{ fmtDate(item.expected_return_date) }}
                </template>
              </span>
              <span v-else class="tag-hp">Tetap di OPD</span>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td :colspan="isOpd ? 7 : 6" style="text-align: center">
              {{ isOpd ? 'Tidak ada barang.' : 'Tidak ada alat.' }}
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="isOpd" style="margin-top: 10px">
        Barang berketerangan <strong>Dikembalikan</strong> tetap menjadi milik Diskominfo Kabupaten
        Tangerang dan dikembalikan sesuai tanggal rencana pada keterangan. Barang berketerangan
        <strong>Tetap di OPD</strong> ditempatkan di instansi penerima tanpa batas waktu.
      </p>
      <p v-else style="margin-top: 10px">
        Alat tersebut di atas dipinjam dalam kondisi baik dan lengkap, serta menjadi tanggung jawab
        peminjam selama masa peminjaman hingga dikembalikan.
      </p>

      <div class="ba-sign">
        <div class="box">
          <div>
            Yang Menyerahkan,<br />
            <strong>{{ isOpd ? 'Diskominfo Kab. Tangerang' : 'Admin Gudang' }}</strong>
          </div>
          <div class="space"></div>
          <div class="nm">{{ auth.user?.name || '(…………………………)' }}</div>
        </div>
        <div class="box">
          <div>
            Yang Menerima,<br />
            <strong>{{ isOpd ? loan.event_name : 'Peminjam' }}</strong>
          </div>
          <div class="space"></div>
          <div class="nm">{{ isOpd ? '(…………………………)' : loan.requester_name }}</div>
        </div>
      </div>

      <div class="ba-note">
        Dokumen ini dicetak dari Sistem Informasi Manajemen Aset (SIMANTAP) Diskominfo Kabupaten
        Tangerang pada {{ printedStamp }} WIB.
      </div>
    </div>

    <!-- ── Halaman 2 — lembar periksa lapangan (khusus peminjaman acara) ───── -->
    <div v-if="!isOpd" class="ba-page" data-testid="berita-acara-checklist">
      <div class="ba-head">
        <img :src="logo" alt="Logo" class="logo" />
        <div class="sub">PEMERINTAH KABUPATEN TANGERANG</div>
        <h1>DINAS KOMUNIKASI DAN INFORMATIKA</h1>
        <div class="sub">Smart Building — Diskominfo Kabupaten Tangerang</div>
      </div>

      <div class="ba-title">
        <h2>DAFTAR PERIKSA ALAT DI LAPANGAN</h2>
        <div class="no">Lampiran Berita Acara Nomor: {{ loan.loan_code }}</div>
      </div>

      <table class="ba-meta" style="margin-top: 14px">
        <tbody>
          <tr>
            <td>Nama Acara</td>
            <td>: <strong>{{ loan.event_name }}</strong></td>
          </tr>
          <tr>
            <td>Tempat / Lokasi</td>
            <td>: <strong>{{ loan.event_location || '—' }}</strong></td>
          </tr>
          <tr>
            <td>Tanggal Kegiatan</td>
            <td>: {{ fmtDate(loan.start_date) }} s/d {{ fmtDate(loan.end_date) }}</td>
          </tr>
          <tr>
            <td>Jam Acara</td>
            <td>: {{ loan.start_time ? `${fmtTime(loan.start_time)} WIB` : '—' }}</td>
          </tr>
          <tr>
            <td>Penanggungjawab</td>
            <td>
              : <strong>{{ loan.requester_name }}</strong
              ><template v-if="requesterPhone"> ({{ requesterPhone }})</template>
            </td>
          </tr>
          <tr v-if="loan.participants.length">
            <td>Personel yang Terlibat</td>
            <td>: {{ loan.participants.join(', ') }}</td>
          </tr>
          <tr v-if="loan.purpose">
            <td>Tujuan / Keperluan</td>
            <td style="white-space: pre-line">: {{ loan.purpose }}</td>
          </tr>
        </tbody>
      </table>

      <div class="ba-hint">
        Centang kolom <strong>Berangkat</strong> saat alat dimuat menuju lokasi, dan kolom
        <strong>Kembali</strong> saat alat dikemas untuk dibawa pulang. Tulis di kolom Keterangan
        bila ada alat yang kurang, rusak, atau tertinggal.
      </div>

      <table class="items checklist">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th>Nama Alat</th>
            <th>Kode Aset</th>
            <th>Brand / Model</th>
            <th>Serial Number</th>
            <th style="width: 62px; text-align: center">Berangkat</th>
            <th style="width: 56px; text-align: center">Kembali</th>
            <th style="width: 110px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.asset_name }}</td>
            <td>{{ item.asset_code }}</td>
            <td>{{ brandModel(item) }}</td>
            <td>{{ item.serial_number || '—' }}</td>
            <td style="text-align: center"><span class="cek-box"></span></td>
            <td style="text-align: center"><span class="cek-box"></span></td>
            <td></td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="8" style="text-align: center">Tidak ada alat.</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 10px; font-size: 12px">
        Jumlah alat yang harus diperiksa: <strong>{{ items.length }} item</strong>.
      </p>

      <div class="ba-sign">
        <div class="box">
          <div>Diperiksa di lokasi oleh,<br /><strong>Petugas / Personel</strong></div>
          <div class="space"></div>
          <div class="nm">(…………………………)</div>
        </div>
        <div class="box">
          <div>Mengetahui,<br /><strong>Penanggungjawab</strong></div>
          <div class="space"></div>
          <div class="nm">{{ loan.requester_name }}</div>
        </div>
      </div>

      <div class="ba-note">
        Lembar ini adalah lampiran dari Berita Acara {{ loan.loan_code }} — dicetak pada
        {{ printedStamp }} WIB.
      </div>
    </div>
  </template>
</template>

<style>
/* Tidak di-scope: dokumen cetak ini menguasai seluruh halaman, sama seperti
   template cetak aplikasi lama yang berdiri sendiri di luar layout. */
.ba-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 28px 34px;
  color: #0f172a;
  font-size: 13px;
}

.ba-head {
  text-align: center;
  border-bottom: 3px double #0f172a;
  padding-bottom: 10px;
  margin-bottom: 4px;
}

.ba-head .logo {
  height: 64px;
  margin-bottom: 6px;
}

.ba-head .sub {
  font-size: 12px;
  letter-spacing: 0.5px;
}

.ba-head h1 {
  font-size: 18px;
  margin: 2px 0;
  font-weight: 800;
}

.ba-title {
  text-align: center;
  margin: 18px 0 4px;
}

.ba-title h2 {
  font-size: 15px;
  font-weight: 700;
  text-decoration: underline;
  margin: 0;
}

.ba-title .no {
  font-size: 12px;
  color: #334155;
}

.ba-meta td {
  padding: 3px 6px;
  vertical-align: top;
  font-size: 13px;
}

.ba-meta td:first-child {
  width: 190px;
  color: #334155;
}

table.items {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 6px;
}

table.items th,
table.items td {
  border: 1px solid #94a3b8;
  padding: 5px 7px;
  font-size: 12px;
  text-align: left;
}

table.items th {
  background: #f1f5f9;
}

.ba-sign {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  margin-top: 36px;
}

.ba-sign .box {
  flex: 1;
  text-align: center;
  font-size: 13px;
}

.ba-sign .space {
  height: 70px;
}

.ba-sign .nm {
  font-weight: 700;
  text-decoration: underline;
}

.ba-note {
  margin-top: 22px;
  font-size: 11px;
  color: #475569;
}

/* Lembar periksa selalu mulai di halaman baru saat dicetak. */
.ba-page + .ba-page {
  page-break-before: always;
}

table.checklist td {
  padding: 10px 7px;
}

.cek-box {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1.5px solid #0f172a;
  border-radius: 2px;
}

.ba-hint {
  font-size: 11px;
  color: #475569;
  margin: 6px 0 2px;
}

.tag-pp,
.tag-hp {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
}

.tag-pp {
  background: #ecfeff;
  color: #0e7490;
}

.tag-hp {
  background: #f1f5f9;
  color: #475569;
}

@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: #fff;
  }
}
</style>
