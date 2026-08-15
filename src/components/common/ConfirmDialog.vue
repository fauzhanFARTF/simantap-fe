<script setup lang="ts">
/**
 * Dialog konfirmasi milik sendiri, bukan `confirm()` bawaan peramban:
 * bahasanya sederhana, tombolnya besar, dan jelas mana yang berbahaya.
 *
 * Dipakai lewat `useConfirm()` agar tidak perlu menaruh komponen ini di setiap
 * halaman yang punya tombol hapus.
 */
import { confirmState, resolveConfirm } from '@/composables/useConfirm'
</script>

<template>
  <!--
    Tetap ter-mount supaya transisi fade-nya berjalan, tetapi `inert` saat
    tertutup: tanpa itu tombol "Batal"/"Ya, Lanjutkan" ikut terbaca pembaca
    layar dan bisa di-Tab dari halaman mana pun, padahal dialognya tak terlihat.
  -->
  <div
    class="sb-modal-backdrop"
    :class="{ show: confirmState.open }"
    :inert="!confirmState.open"
    :aria-hidden="!confirmState.open"
    data-testid="confirm-backdrop"
    @click.self="resolveConfirm(false)"
  >
    <div class="sb-modal" role="alertdialog" aria-labelledby="confirmTitle">
      <div class="sb-modal-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h5 id="confirmTitle">Konfirmasi Tindakan</h5>
      <p>{{ confirmState.message }}</p>
      <div class="sb-modal-actions">
        <button
          type="button"
          class="btn btn-outline-navy"
          data-testid="confirm-cancel"
          @click="resolveConfirm(false)"
        >
          Batal
        </button>
        <button
          type="button"
          class="btn btn-danger"
          data-testid="confirm-ok"
          @click="resolveConfirm(true)"
        >
          Ya, Lanjutkan
        </button>
      </div>
    </div>
  </div>
</template>
