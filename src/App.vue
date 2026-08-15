<script setup lang="ts">
/**
 * Akar aplikasi.
 *
 * Sesi dipulihkan dari token tersimpan SEBELUM router menggambar apa pun —
 * tanpa jeda ini, membuka ulang halaman dalam keadaan masih login akan
 * memantul sekejap ke halaman masuk.
 */
import { onMounted } from 'vue'

import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  void auth.loadConfig().catch(() => {
    // Konfigurasi publik gagal dimuat (backend belum jalan) — halaman masuk
    // tetap bisa digambar dengan tombol Google & CAPTCHA disembunyikan.
  })
})
</script>

<template>
  <div v-if="auth.initialising" class="app-boot" data-testid="app-boot">
    <div class="spinner-border text-secondary" role="status">
      <span class="visually-hidden">Memuat…</span>
    </div>
  </div>
  <RouterView v-else />

  <!-- Satu dialog untuk seluruh aplikasi; dipanggil lewat useConfirm(). -->
  <ConfirmDialog />
</template>

<style scoped>
.app-boot {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
</style>
