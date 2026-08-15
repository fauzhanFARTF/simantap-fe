/**
 * Keadaan antarmuka yang bertahan lintas halaman: pesan flash, tema terang /
 * gelap, dan lebar menu samping.
 *
 * Tema & lebar sidebar sudah dipasang skrip di `index.html` SEBELUM halaman
 * tergambar; store ini hanya mengurus tombolnya dan menyimpan pilihan pengguna.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FlashType = 'success' | 'error'

export interface Flash {
  id: number
  type: FlashType
  message: string
}

const THEME_KEY = 'theme'
const SIDEBAR_KEY = 'sidebarCollapsed'

let flashId = 0

export const useUiStore = defineStore('ui', () => {
  const flashes = ref<Flash[]>([])
  const theme = ref<'light' | 'dark'>(
    (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light',
  )
  const sidebarCollapsed = ref(document.documentElement.classList.contains('sb-collapsed'))
  const sidebarOpen = ref(false)

  function flash(type: FlashType, message: string) {
    const item: Flash = { id: ++flashId, type, message }
    flashes.value.push(item)
    // Sama dengan aplikasi lama: pesan memudar sendiri setelah 4 detik.
    setTimeout(() => dismiss(item.id), 4600)
  }

  const success = (message: string) => flash('success', message)
  const error = (message: string) => flash('error', message)

  function dismiss(id: number) {
    flashes.value = flashes.value.filter((item) => item.id !== id)
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', theme.value)
    try {
      localStorage.setItem(THEME_KEY, theme.value)
    } catch {
      // Mode privat memblokir localStorage — temanya tetap berlaku untuk sesi ini.
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    document.documentElement.classList.toggle('sb-collapsed', sidebarCollapsed.value)
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.value ? '1' : '0')
    } catch {
      // idem
    }
  }

  const openSidebar = () => (sidebarOpen.value = true)
  const closeSidebar = () => (sidebarOpen.value = false)

  return {
    flashes,
    theme,
    sidebarCollapsed,
    sidebarOpen,
    flash,
    success,
    error,
    dismiss,
    toggleTheme,
    toggleSidebar,
    openSidebar,
    closeSidebar,
  }
})
