/** Sesi pengguna: token, profil, dan hak akses turunannya. */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { authApi, meApi } from '@/api'
import { setSessionExpiredHandler, tokenStorage } from '@/api/client'
import type { AppConfig, CurrentUser, Role } from '@/types/models'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)
  const config = ref<AppConfig | null>(null)
  const unreadNotifications = ref(0)
  const pendingRegistrations = ref(0)
  const initialising = ref(true)

  const isAuthenticated = computed(() => user.value !== null)

  /**
   * Cek peran untuk menampilkan menu & tombol.
   *
   * Super Admin otomatis lolos SEMUA pengecekan — sama persis dengan aturan di
   * backend, supaya menu yang terlihat tidak pernah berbeda dari yang benar-benar
   * boleh diakses.
   */
  function hasRole(...roles: Role[]): boolean {
    if (!user.value) return false
    if (user.value.roles.includes('superadmin')) return true
    return roles.some((role) => user.value!.roles.includes(role))
  }

  const isSuperadmin = computed(() => user.value?.roles.includes('superadmin') ?? false)
  const isPureRequester = computed(() => user.value?.is_pure_requester ?? false)
  const isPersonalBorrower = computed(() => user.value?.is_personal_borrower ?? false)

  async function loadConfig() {
    if (!config.value) config.value = await authApi.config()
    return config.value
  }

  async function fetchMe() {
    const payload = await meApi.fetch()
    user.value = payload.user
    unreadNotifications.value = payload.unread_notifications
    pendingRegistrations.value = payload.pending_registrations
    return payload
  }

  /** Pulihkan sesi dari token tersimpan saat aplikasi dimuat ulang. */
  async function restore() {
    initialising.value = true
    try {
      if (tokenStorage.access) await fetchMe()
    } catch {
      tokenStorage.clear()
      user.value = null
    } finally {
      initialising.value = false
    }
  }

  async function login(email: string, password: string, turnstileToken?: string) {
    const response = await authApi.login(email, password, turnstileToken)
    tokenStorage.set(response.access, response.refresh)
    user.value = response.user
    await fetchMe()
  }

  function adoptSession(access: string, refresh: string, profile: CurrentUser) {
    tokenStorage.set(access, refresh)
    user.value = profile
  }

  /**
   * Kembali ke halaman masuk lewat pemuatan penuh, bukan `router.push`.
   *
   * Penjaga rute hanya berjalan saat navigasi, jadi membersihkan state saja
   * membuat pengguna tertahan di halaman yang sudah tak punya sesi. Pemuatan
   * penuh juga menyapu SELURUH store — termasuk `notifications` yang masih
   * memegang data pengguna sebelumnya — persis seperti aplikasi lama yang
   * mengakhiri logout dengan `redirect('/login')`.
   */
  function redirectToLogin() {
    if (window.location.pathname === '/login') return
    window.location.replace('/login')
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Sesi di server mungkin sudah tidak berlaku; membuang token lokal tetap
      // wajib dilakukan agar pengguna benar-benar keluar.
    }
    clearSession()
    redirectToLogin()
  }

  function clearSession() {
    tokenStorage.clear()
    user.value = null
    unreadNotifications.value = 0
    pendingRegistrations.value = 0
  }

  // Sesi kedaluwarsa di tengah pemakaian diperlakukan sama dengan logout:
  // token dibuang lalu pengguna diantar ke halaman masuk. Tanpa ini, kegagalan
  // 401 hanya mengosongkan state dan menyisakan layar yang tidak bisa dipakai.
  setSessionExpiredHandler(() => {
    clearSession()
    // Kalau token basi ketahuan saat `restore()` di awal muat, penjaga rute yang
    // mengantar ke halaman masuk — memuat ulang di sini hanya menambah kedipan.
    if (!initialising.value) redirectToLogin()
  })

  return {
    user,
    config,
    unreadNotifications,
    pendingRegistrations,
    initialising,
    isAuthenticated,
    isSuperadmin,
    isPureRequester,
    isPersonalBorrower,
    hasRole,
    loadConfig,
    fetchMe,
    restore,
    login,
    adoptSession,
    logout,
    clearSession,
  }
})
