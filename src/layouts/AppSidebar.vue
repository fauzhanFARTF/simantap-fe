<script setup lang="ts">
/**
 * Menu samping.
 *
 * Setiap butir menu menyebut peran yang boleh melihatnya, sama persis dengan
 * pembatasan `meta.roles` di router — sehingga tidak ada menu yang terlihat
 * tapi menolak saat diklik, maupun sebaliknya.
 */
import { computed, onMounted, watch } from 'vue'

import logo from '@/assets/img/logo-kominfo-icon.png'
import { useParticles } from '@/composables/useParticles'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { Role } from '@/types/models'

interface NavItem {
  label: string
  icon: string
  to: string
  roles?: Role[]
  /** Lencana angka (mis. pendaftaran yang menunggu verifikasi). */
  badge?: 'registrations'
}

interface NavSection {
  title: string
  roles?: Role[]
  items: NavItem[]
}

const auth = useAuthStore()
const ui = useUiStore()
const particles = useParticles('particles-sidebar', 0.28)

const SECTIONS: NavSection[] = [
  {
    title: 'Menu',
    items: [
      { label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' },
      { label: 'Peminjaman', icon: 'fa-clipboard-list', to: '/loans' },
      {
        label: 'Approval',
        icon: 'fa-check-double',
        to: '/approvals',
        roles: ['supervisor', 'admin', 'pimpinan'],
      },
    ],
  },
  {
    title: 'Gudang',
    roles: ['admin_gudang', 'admin', 'pimpinan'],
    items: [
      {
        label: 'Penyerahan',
        icon: 'fa-arrow-right-from-bracket',
        to: '/checkout',
        roles: ['admin_gudang', 'admin', 'pimpinan'],
      },
      {
        label: 'Pengembalian',
        icon: 'fa-arrow-right-to-bracket',
        to: '/checkin',
        roles: ['admin_gudang', 'admin', 'pimpinan'],
      },
      {
        label: 'Barang di OPD',
        icon: 'fa-building-columns',
        to: '/opd-items',
        roles: ['admin_gudang', 'admin'],
      },
      {
        label: 'Perbaikan',
        icon: 'fa-screwdriver-wrench',
        to: '/repairs',
        roles: ['admin_gudang', 'admin'],
      },
    ],
  },
  {
    title: 'Master Data',
    roles: [
      'admin_gudang', 'admin', 'supervisor',
      'administrator_pembantu_manajemen_alat',
      'administrator_pembantu_manajemen_kategori', 'pimpinan',
    ],
    items: [
      {
        label: 'Alat / Aset',
        icon: 'fa-boxes-stacked',
        to: '/inventory',
        roles: [
          'admin_gudang', 'admin', 'supervisor',
          'administrator_pembantu_manajemen_alat', 'pimpinan',
        ],
      },
      {
        label: 'Paket Alat',
        icon: 'fa-cubes',
        to: '/packages',
        roles: ['admin_gudang', 'admin', 'supervisor'],
      },
      {
        label: 'Kategori',
        icon: 'fa-tags',
        to: '/categories',
        roles: [
          'admin_gudang', 'admin', 'supervisor',
          'administrator_pembantu_manajemen_kategori',
        ],
      },
    ],
  },
  {
    title: 'Administrasi',
    roles: ['admin', 'administrator_pembantu_manajemen_user'],
    items: [
      {
        label: 'Manajemen User',
        icon: 'fa-user-shield',
        to: '/users',
        roles: ['admin', 'administrator_pembantu_manajemen_user'],
      },
      {
        label: 'Verifikasi Pendaftaran',
        icon: 'fa-user-check',
        to: '/registrations',
        roles: ['admin', 'administrator_pembantu_manajemen_user'],
        badge: 'registrations',
      },
      { label: 'Riwayat Terhapus', icon: 'fa-trash-can', to: '/trash', roles: ['admin'] },
    ],
  },
  {
    title: 'Notifikasi',
    roles: ['admin', 'pimpinan'],
    items: [
      {
        label: 'Log Notifikasi',
        icon: 'fa-list-check',
        to: '/notifications/log',
        roles: ['admin', 'pimpinan'],
      },
    ],
  },
  {
    title: 'Akun',
    items: [{ label: 'Profil Saya', icon: 'fa-user', to: '/profile' }],
  },
]

const visibleSections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || auth.hasRole(...item.roles)),
  })).filter(
    (section) =>
      section.items.length > 0 && (!section.roles || auth.hasRole(...section.roles)),
  ),
)

function badgeValue(item: NavItem): number {
  return item.badge === 'registrations' ? auth.pendingRegistrations : 0
}

/** Menu ciut hanya menampilkan ikon, jadi namanya dipindah ke tooltip bawaan. */
const itemTitle = (label: string) => (ui.sidebarCollapsed ? label : undefined)

onMounted(() => void particles.start())
watch(() => ui.sidebarCollapsed, () => void particles.refresh())

function onNavigate() {
  // Di layar kecil menu adalah laci yang menutupi halaman — tutup setelah pindah.
  if (window.innerWidth <= 900) ui.closeSidebar()
}
</script>

<template>
  <aside class="sidebar" :class="{ open: ui.sidebarOpen }" data-testid="sidebar">
    <div id="particles-sidebar" aria-hidden="true"></div>

    <button
      type="button"
      class="sidebar-close"
      aria-label="Tutup menu"
      data-testid="btn-sidebar-close"
      @click="ui.closeSidebar()"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="brand">
      <div class="brand-mark"><img :src="logo" alt="Logo Kominfo" /></div>
      <div class="brand-text">
        <div class="brand-title">SIMANTAP</div>
        <div class="brand-sub">Diskominfo · Kab. Tangerang</div>
      </div>
    </div>

    <button
      type="button"
      class="sidebar-toggle"
      :aria-label="ui.sidebarCollapsed ? 'Lebarkan menu' : 'Ciutkan menu'"
      :title="ui.sidebarCollapsed ? 'Lebarkan menu' : 'Ciutkan menu'"
      :aria-expanded="!ui.sidebarCollapsed"
      data-testid="btn-sidebar-toggle"
      @click="ui.toggleSidebar()"
    >
      <i :class="ui.sidebarCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'"></i>
    </button>

    <template v-for="section in visibleSections" :key="section.title">
      <div class="nav-section">{{ section.title }}</div>
      <RouterLink
        v-for="item in section.items"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :title="itemTitle(item.label)"
        :data-testid="`nav-${item.to.replace(/\//g, '-').replace(/^-/, '')}`"
        @click="onNavigate"
      >
        <i :class="`fa-solid ${item.icon}`"></i><span>{{ item.label }}</span>
        <span v-if="badgeValue(item)" class="nav-badge" data-testid="nav-reg-count">
          {{ badgeValue(item) }}
        </span>
      </RouterLink>
    </template>

    <form style="margin-top: 8px" @submit.prevent="auth.logout()">
      <button
        type="submit"
        class="nav-item"
        style="border: 0; background: transparent; width: 100%; text-align: left; cursor: pointer; color: #f87171"
        data-testid="nav-logout"
      >
        <i class="fa-solid fa-arrow-right-from-bracket"></i><span>Keluar</span>
      </button>
    </form>
  </aside>
</template>
