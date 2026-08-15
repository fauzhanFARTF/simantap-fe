<script setup lang="ts">
/** Konfirmasi bahwa pendaftaran sudah masuk dan menunggu verifikasi admin. */
import logo from '@/assets/img/logo-kominfo-icon.png'
import AuthLayout from '@/layouts/AuthLayout.vue'
</script>

<template>
  <AuthLayout>
    <div class="auth-card card-sb" data-testid="register-pending-card">
      <div class="brand-mark"><img :src="logo" alt="Logo Kominfo" /></div>
      <h1>Menunggu Verifikasi</h1>
      <p class="sub">Pendaftaran Anda sudah kami terima.</p>

      <div class="alert alert-info text-start" data-testid="pending-message">
        <i class="fa-solid fa-hourglass-half me-2"></i>
        Administrator Diskominfo akan meninjau pendaftaran Anda terlebih dahulu. Setelah disetujui,
        Anda bisa langsung masuk memakai tombol <strong>Masuk dengan Google</strong> di halaman
        awal.
      </div>

      <p class="text-slate small">
        Belum disetujui juga? Silakan hubungi Administrator Diskominfo Kabupaten Tangerang.
      </p>

      <RouterLink to="/login" class="btn btn-outline-navy w-100" data-testid="pending-back">
        <i class="fa-solid fa-arrow-left"></i> Kembali ke Halaman Masuk
      </RouterLink>
    </div>
  </AuthLayout>
</template>
