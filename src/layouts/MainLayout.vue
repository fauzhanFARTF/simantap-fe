<script setup lang="ts">
/** Kerangka aplikasi: menu samping + bilah atas + isi halaman. */
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppSidebar from './AppSidebar.vue'
import FlashMessages from '@/components/common/FlashMessages.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const notifications = useNotificationStore()

const pageTitle = computed(() => (route.meta.title as string) ?? '')
const initial = computed(() => auth.user?.name.charAt(0).toUpperCase() ?? '?')

onMounted(() => notifications.startPolling())
onUnmounted(() => notifications.stopPolling())

// Laci menu di layar kecil menutupi halaman; kunci gulir badan halaman selama
// terbuka supaya yang tergulir adalah menunya, bukan konten di baliknya.
watch(
  () => ui.sidebarOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') ui.closeSidebar()
}
onMounted(() => document.addEventListener('keydown', onEscape))
onUnmounted(() => document.removeEventListener('keydown', onEscape))
</script>

<template>
  <div class="app-shell">
    <div
      class="sidebar-backdrop"
      :class="{ show: ui.sidebarOpen }"
      data-testid="sidebar-backdrop"
      @click="ui.closeSidebar()"
    ></div>

    <AppSidebar />

    <div class="main-wrap">
      <header class="topbar">
        <div class="d-flex align-items-center gap-2 min-w-0">
          <button
            type="button"
            class="menu-toggle"
            aria-label="Buka menu"
            data-testid="btn-menu-toggle"
            @click="ui.openSidebar()"
          >
            <i class="fa-solid fa-bars"></i>
          </button>
          <div class="min-w-0">
            <h1 class="page-title">{{ pageTitle }}</h1>
            <div class="breadcrumbs">SIMANTAP — Diskominfo Kab. Tangerang</div>
          </div>
        </div>

        <div class="top-actions">
          <button
            type="button"
            class="bell theme-toggle"
            :aria-label="ui.theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
            :title="ui.theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
            data-testid="btn-theme-toggle"
            @click="ui.toggleTheme()"
          >
            <i :class="ui.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
          </button>

          <RouterLink to="/notifications" class="bell" data-testid="notif-bell" title="Notifikasi">
            <i class="fa-regular fa-bell"></i>
            <span v-if="notifications.unread" class="dot" data-testid="bell-count">
              {{ notifications.unread }}
            </span>
          </RouterLink>

          <div class="dropdown">
            <button
              class="user-chip"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              data-testid="user-chip"
            >
              <div class="av">{{ initial }}</div>
              <div class="who">
                <div>{{ auth.user?.name }}</div>
                <div class="role">{{ auth.user?.role_label }}</div>
              </div>
              <i class="fa-solid fa-chevron-down user-chip-caret"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow" data-testid="user-menu">
              <li class="px-3 py-2">
                <div class="fw-semibold" style="font-size: 13.5px">{{ auth.user?.name }}</div>
                <div class="text-slate" style="font-size: 12px">{{ auth.user?.email }}</div>
                <div
                  class="text-slate"
                  style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em"
                >
                  {{ auth.user?.role_label }}
                </div>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <RouterLink class="dropdown-item" to="/profile" data-testid="menu-profile">
                  <i class="fa-regular fa-user me-2"></i> Kelola Profil
                </RouterLink>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button
                  type="button"
                  class="dropdown-item text-danger"
                  data-testid="menu-logout"
                  @click="auth.logout()"
                >
                  <i class="fa-solid fa-right-from-bracket me-2"></i> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main class="page-body">
        <FlashMessages />
        <RouterView />
      </main>
    </div>
  </div>
</template>
