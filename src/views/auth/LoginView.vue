<script setup lang="ts">
/** Halaman masuk: email + password, atau lewat akun Google. */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { authApi } from '@/api'
import { ApiError } from '@/api/client'
import logo from '@/assets/img/logo-kominfo-icon.png'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const GOOGLE_STATE_KEY = 'simantap.google_state'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  await auth.loadConfig().catch(() => undefined)
  if (auth.config?.turnstile_enabled) loadTurnstile()
})

/** Widget Turnstile hanya dimuat bila fiturnya benar-benar aktif di server. */
function loadTurnstile() {
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

/**
 * Token Turnstile dibaca SAAT submit, bukan lewat polling berkala.
 *
 * Widget mengisi input tersembunyi bernama `cf-turnstile-response` begitu
 * tantangannya lolos. Polling membuat ada jendela waktu di mana tombol Masuk
 * sudah bisa ditekan tapi token belum tersalin — dan login ditolak server
 * dengan "Verifikasi anti-bot gagal" padahal widgetnya sudah hijau.
 */
function readTurnstileToken(): string {
  const field = document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')
  return field?.value ?? ''
}

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value, readTurnstileToken())
    const redirect = route.query.redirect
    await router.push(typeof redirect === 'string' ? redirect : '/dashboard')
  } catch (exception) {
    error.value =
      exception instanceof ApiError ? exception.message : 'Terjadi kesalahan tak terduga.'
  } finally {
    submitting.value = false
  }
}

async function loginWithGoogle() {
  try {
    const { auth_url, state } = await authApi.googleStart()
    // State disimpan lokal lalu dicocokkan di halaman callback — pagar terhadap
    // permintaan yang tidak berasal dari alur ini.
    sessionStorage.setItem(GOOGLE_STATE_KEY, state)
    window.location.href = auth_url
  } catch (exception) {
    error.value =
      exception instanceof ApiError ? exception.message : 'Login dengan Google gagal dimulai.'
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card card-sb" data-testid="login-card">
      <div class="brand-mark"><img :src="logo" alt="Logo Kominfo" /></div>
      <h1>Masuk ke SIMANTAP</h1>
      <p class="sub">
        Sistem Informasi Manajemen Aset Terpadu — Diskominfo Kabupaten Tangerang
      </p>

      <div v-if="error" class="alert alert-danger" data-testid="login-error">{{ error }}</div>

      <form data-testid="login-form" @submit.prevent="submit">
        <div class="mb-3">
          <label class="form-label" for="loginEmail">Email Dinas</label>
          <input
            id="loginEmail"
            v-model="email"
            type="email"
            class="form-control"
            required
            autofocus
            placeholder="nama@diskominfo.tangerangkab.go.id"
            data-testid="login-email"
          />
        </div>

        <div class="mb-4">
          <label class="form-label" for="loginPassword">Password</label>
          <div class="input-group">
            <input
              id="loginPassword"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              required
              placeholder="Masukkan password Anda"
              data-testid="login-password"
            />
            <button
              type="button"
              class="input-group-text"
              style="cursor: pointer"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>

        <div v-if="auth.config?.turnstile_enabled" class="mb-3 d-flex justify-content-center">
          <div
            class="cf-turnstile"
            :data-sitekey="auth.config.turnstile_site_key"
            data-theme="auto"
            data-testid="turnstile-widget"
          ></div>
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-lg w-100"
          :disabled="submitting"
          data-testid="login-submit"
        >
          <i class="fa-solid fa-right-to-bracket"></i>
          {{ submitting ? 'Memproses…' : 'Masuk' }}
        </button>
      </form>

      <template v-if="auth.config?.google_enabled">
        <div class="auth-divider">atau</div>
        <button
          type="button"
          class="btn btn-google btn-lg w-100"
          data-testid="login-google"
          @click="loginWithGoogle"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Masuk dengan Google
        </button>
        <div class="creds-hint text-center" data-testid="register-hint">
          <div><strong>Belum punya akun?</strong> Daftar lewat tombol di atas.</div>
          <div class="reg-note">Pendaftaran ditinjau Administrator terlebih dahulu.</div>
        </div>
      </template>
    </div>
  </AuthLayout>
</template>
