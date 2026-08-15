/** Jumlah notifikasi belum dibaca untuk lencana lonceng di bilah atas. */

import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'

import { notificationApi } from '@/api'
import { useAuthStore } from './auth'

/** Sama dengan aplikasi lama: lonceng disegarkan tiap 30 detik. */
const POLL_INTERVAL_MS = 30_000

export const useNotificationStore = defineStore('notifications', () => {
  const unread = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    try {
      const { count } = await notificationApi.unreadCount()
      unread.value = count
      auth.unreadNotifications = count
    } catch {
      // Lencana yang gagal disegarkan bukan alasan untuk mengganggu pengguna.
    }
  }

  function startPolling() {
    if (timer) return
    void refresh()
    timer = setInterval(() => void refresh(), POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
    timer = null
  }

  onScopeDispose(stopPolling)

  return { unread, refresh, startPolling, stopPolling }
})
