<script setup lang="ts">
/**
 * Titik balik dari Google.
 *
 * Server yang memutuskan apa yang harus terjadi (`action`): masuk, lanjut
 * mendaftar, atau menunggu verifikasi. Halaman ini hanya menerjemahkan
 * keputusan itu menjadi tujuan navigasi — supaya aturannya tetap satu tempat.
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { authApi } from '@/api'
import { ApiError } from '@/api/client'
import logo from '@/assets/img/logo-kominfo-icon.png'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const GOOGLE_STATE_KEY = 'simantap.google_state'
const GOOGLE_CODE_KEY = 'simantap.google_code'
const GOOGLE_PROFILE_KEY = 'simantap.google_profile'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const error = ref('')

onMounted(async () => {
  const code = String(route.query.code ?? '')
  const state = String(route.query.state ?? '')
  const expected = sessionStorage.getItem(GOOGLE_STATE_KEY) ?? ''
  sessionStorage.removeItem(GOOGLE_STATE_KEY)

  if (route.query.error) {
    error.value = 'Login dengan Google dibatalkan.'
    return
  }

  try {
    const result = await authApi.googleCallback(code, state, expected)

    if (result.action === 'login') {
      auth.adoptSession(result.access, result.refresh, result.user)
      await auth.fetchMe()
      await router.replace('/dashboard')
      return
    }
    if (result.action === 'register') {
      // Kode ditahan sebentar; server menukarnya ulang saat form dikirim.
      sessionStorage.setItem(GOOGLE_CODE_KEY, code)
      sessionStorage.setItem(GOOGLE_PROFILE_KEY, JSON.stringify(result.profile))
      await router.replace('/daftar')
      return
    }
    await router.replace('/daftar/menunggu')
  } catch (exception) {
    error.value =
      exception instanceof ApiError ? exception.message : 'Login dengan Google gagal.'
    ui.error(error.value)
  }
})
</script>

<template>
  <AuthLayout>
    <div class="auth-card card-sb" data-testid="google-callback-card">
      <div class="brand-mark"><img :src="logo" alt="Logo Kominfo" /></div>

      <template v-if="error">
        <h1>Gagal Masuk</h1>
        <div class="alert alert-danger">{{ error }}</div>
        <RouterLink to="/login" class="btn btn-outline-navy w-100">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Halaman Masuk
        </RouterLink>
      </template>

      <template v-else>
        <h1>Memproses…</h1>
        <p class="sub">Sedang memeriksa akun Google Anda.</p>
        <div class="spinner-border text-secondary" role="status">
          <span class="visually-hidden">Memuat…</span>
        </div>
      </template>
    </div>
  </AuthLayout>
</template>
