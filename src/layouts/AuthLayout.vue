<script setup lang="ts">
/** Kerangka halaman masuk & pendaftaran: panel biru + kolom formulir. */
import { onMounted } from 'vue'

import logo from '@/assets/img/logo-kominfo-icon.png'
import { useParticles } from '@/composables/useParticles'

const particles = useParticles('particles-js')

onMounted(() => void particles.start())
</script>

<template>
  <div class="auth-page">
    <div class="auth-side no-print">
      <div id="particles-js" aria-hidden="true"></div>
      <div class="side-mark"><img :src="logo" alt="Logo Kominfo" /></div>
      <h2>Kelola semua aset dinas dengan tenang, semua tercatat rapi.</h2>
      <p>
        SIMANTAP membantu tim Diskominfo Kabupaten Tangerang meminjam, memeriksa, dan merawat
        berbagai barang milik negara — dari peralatan streaming, perangkat jaringan, hingga
        kendaraan dinas (mobil &amp; motor) — tanpa ribet, cukup beberapa klik.
      </p>
      <div class="side-feats">
        <div class="feat">
          <i class="fa-solid fa-qrcode"></i> Penyerahan / pengembalian alat cukup pindai QR code
        </div>
        <div class="feat">
          <i class="fa-solid fa-bell"></i> Notifikasi otomatis untuk setiap persetujuan
        </div>
        <div class="feat">
          <i class="fa-solid fa-shield-halved"></i> Riwayat &amp; laporan aset selalu tersimpan aman
        </div>
      </div>
    </div>
    <div class="auth-form-col">
      <slot />
    </div>
  </div>
</template>
