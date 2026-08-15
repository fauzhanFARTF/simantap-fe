/**
 * Peta rute aplikasi.
 *
 * Path-nya sengaja sama persis dengan aplikasi lama (/loans, /checkout/:uuid,
 * /repairs/:uuid, …) supaya tautan yang sudah tersebar — di notifikasi web,
 * email, maupun Telegram — tetap membuka halaman yang benar.
 *
 * Kewenangan dijaga dua lapis: `meta.roles` menyaring di sini agar pengguna
 * tidak masuk ke halaman yang pasti ditolak, dan backend tetap menjadi penentu
 * akhir untuk setiap permintaan data.
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/models'

declare module 'vue-router' {
  interface RouteMeta {
    /** Judul di bilah atas & <title> peramban. */
    title?: string
    /** Halaman untuk tamu (halaman masuk & pendaftaran). */
    guest?: boolean
    /** Peran yang boleh membuka. Kosong = semua yang sudah masuk. */
    roles?: Role[]
    /** Halaman cetak: tanpa menu samping & bilah atas. */
    print?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  // ── Tamu ──────────────────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true, title: 'Masuk' },
  },
  {
    path: '/auth/google/callback',
    name: 'google-callback',
    component: () => import('@/views/auth/GoogleCallbackView.vue'),
    meta: { guest: true, title: 'Masuk dengan Google' },
  },
  {
    path: '/daftar',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true, title: 'Lengkapi Pendaftaran' },
  },
  {
    path: '/daftar/menunggu',
    name: 'register-pending',
    component: () => import('@/views/auth/RegisterPendingView.vue'),
    meta: { guest: true, title: 'Menunggu Verifikasi' },
  },

  // ── Halaman cetak ─────────────────────────────────────────────────────────
  {
    path: '/loans/:uuid/berita-acara',
    name: 'loan-berita-acara',
    component: () => import('@/views/print/BeritaAcaraView.vue'),
    meta: { print: true, title: 'Berita Acara', roles: ['admin_gudang', 'admin'] },
  },
  {
    path: '/repairs/:uuid/print',
    name: 'repair-print',
    component: () => import('@/views/print/RepairFormView.vue'),
    meta: { print: true, title: 'SPK Perbaikan', roles: ['admin_gudang', 'admin'] },
  },
  {
    path: '/inventory/barcode/print',
    name: 'barcode-print',
    component: () => import('@/views/print/BarcodePrintView.vue'),
    meta: {
      print: true,
      title: 'Cetak QR Alat',
      roles: ['admin_gudang', 'admin', 'supervisor', 'administrator_pembantu_manajemen_alat'],
    },
  },

  // ── Aplikasi ──────────────────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },

      // Peminjaman
      {
        path: 'loans',
        name: 'loans',
        component: () => import('@/views/loans/LoanListView.vue'),
        meta: { title: 'Peminjaman' },
      },
      {
        path: 'loans/create',
        name: 'loan-create',
        component: () => import('@/views/loans/LoanCreateView.vue'),
        meta: { title: 'Ajukan Peminjaman', roles: ['pemohon', 'inventory_staff', 'admin'] },
      },
      {
        path: 'loans/:uuid',
        name: 'loan-detail',
        component: () => import('@/views/loans/LoanDetailView.vue'),
        meta: { title: 'Detail Peminjaman' },
      },
      {
        path: 'approvals',
        name: 'approvals',
        component: () => import('@/views/loans/ApprovalView.vue'),
        meta: { title: 'Approval Peminjaman', roles: ['supervisor', 'admin', 'pimpinan'] },
      },

      // Gudang
      {
        path: 'checkout',
        name: 'checkout',
        component: () => import('@/views/checkout/CheckoutListView.vue'),
        meta: { title: 'Penyerahan Alat', roles: ['admin_gudang', 'admin', 'pimpinan'] },
      },
      {
        path: 'checkout/:uuid',
        name: 'checkout-scan',
        component: () => import('@/views/checkout/CheckoutScanView.vue'),
        meta: { title: 'Scan Penyerahan', roles: ['admin_gudang', 'admin'] },
      },
      {
        path: 'checkin',
        name: 'checkin',
        component: () => import('@/views/checkin/CheckinListView.vue'),
        meta: { title: 'Pengembalian Alat', roles: ['admin_gudang', 'admin', 'pimpinan'] },
      },
      {
        path: 'checkin/:uuid',
        name: 'checkin-scan',
        component: () => import('@/views/checkin/CheckinScanView.vue'),
        meta: { title: 'Pengembalian', roles: ['admin_gudang', 'admin'] },
      },
      {
        path: 'opd-items',
        name: 'opd-items',
        component: () => import('@/views/opd/OpdItemsView.vue'),
        meta: { title: 'Barang di OPD', roles: ['admin_gudang', 'admin'] },
      },
      {
        path: 'repairs',
        name: 'repairs',
        component: () => import('@/views/repairs/RepairListView.vue'),
        meta: { title: 'Perbaikan Alat', roles: ['admin_gudang', 'admin'] },
      },
      {
        path: 'repairs/:uuid',
        name: 'repair-detail',
        component: () => import('@/views/repairs/RepairDetailView.vue'),
        meta: { title: 'Detail Perbaikan', roles: ['admin_gudang', 'admin'] },
      },

      // Master data
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/views/inventory/AssetListView.vue'),
        meta: {
          title: 'Manajemen Alat',
          roles: [
            'admin_gudang', 'admin', 'supervisor',
            'administrator_pembantu_manajemen_alat', 'pimpinan',
          ],
        },
      },
      {
        path: 'inventory/create',
        name: 'asset-create',
        component: () => import('@/views/inventory/AssetFormView.vue'),
        meta: {
          title: 'Tambah Alat',
          roles: ['admin_gudang', 'admin', 'administrator_pembantu_manajemen_alat'],
        },
      },
      {
        path: 'inventory/:uuid/edit',
        name: 'asset-edit',
        component: () => import('@/views/inventory/AssetFormView.vue'),
        meta: {
          title: 'Ubah Alat',
          roles: ['admin_gudang', 'admin', 'administrator_pembantu_manajemen_alat'],
        },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/inventory/CategoryListView.vue'),
        meta: {
          title: 'Kategori Alat',
          roles: [
            'admin_gudang', 'admin', 'supervisor',
            'administrator_pembantu_manajemen_kategori',
          ],
        },
      },
      {
        path: 'categories/create',
        name: 'category-create',
        component: () => import('@/views/inventory/CategoryFormView.vue'),
        meta: {
          title: 'Tambah Kategori',
          roles: ['admin', 'admin_gudang', 'administrator_pembantu_manajemen_kategori'],
        },
      },
      {
        path: 'categories/:uuid/edit',
        name: 'category-edit',
        component: () => import('@/views/inventory/CategoryFormView.vue'),
        meta: {
          title: 'Ubah Kategori',
          roles: ['admin', 'admin_gudang', 'administrator_pembantu_manajemen_kategori'],
        },
      },
      {
        path: 'packages',
        name: 'packages',
        component: () => import('@/views/packages/PackageListView.vue'),
        meta: { title: 'Paket Alat', roles: ['admin_gudang', 'admin', 'supervisor'] },
      },
      {
        path: 'packages/create',
        name: 'package-create',
        component: () => import('@/views/packages/PackageFormView.vue'),
        meta: { title: 'Tambah Paket', roles: ['admin_gudang', 'admin'] },
      },
      {
        path: 'packages/:uuid/edit',
        name: 'package-edit',
        component: () => import('@/views/packages/PackageFormView.vue'),
        meta: { title: 'Ubah Paket', roles: ['admin_gudang', 'admin'] },
      },

      // Administrasi
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/users/UserListView.vue'),
        meta: {
          title: 'Manajemen User',
          roles: ['admin', 'administrator_pembantu_manajemen_user'],
        },
      },
      {
        path: 'users/create',
        name: 'user-create',
        component: () => import('@/views/users/UserFormView.vue'),
        meta: { title: 'Tambah User', roles: ['admin', 'administrator_pembantu_manajemen_user'] },
      },
      {
        path: 'users/:uuid/edit',
        name: 'user-edit',
        component: () => import('@/views/users/UserFormView.vue'),
        meta: { title: 'Ubah User', roles: ['admin', 'administrator_pembantu_manajemen_user'] },
      },
      {
        path: 'registrations',
        name: 'registrations',
        component: () => import('@/views/users/RegistrationView.vue'),
        meta: {
          title: 'Verifikasi Pendaftaran',
          roles: ['admin', 'administrator_pembantu_manajemen_user'],
        },
      },
      {
        path: 'trash',
        name: 'trash',
        component: () => import('@/views/trash/TrashView.vue'),
        meta: { title: 'Riwayat Terhapus', roles: ['admin'] },
      },

      // Notifikasi & akun
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/views/notifications/NotificationListView.vue'),
        meta: { title: 'Notifikasi' },
      },
      {
        path: 'notifications/arsip',
        name: 'notifications-archive',
        component: () => import('@/views/notifications/NotificationListView.vue'),
        meta: { title: 'Arsip Notifikasi' },
      },
      {
        path: 'notifications/log',
        name: 'notifications-log',
        component: () => import('@/views/notifications/NotificationLogView.vue'),
        meta: { title: 'Log Notifikasi', roles: ['admin', 'pimpinan'] },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/users/ProfileView.vue'),
        meta: { title: 'Profil Saya' },
      },

      // Galat
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/errors/ForbiddenView.vue'),
        meta: { title: 'Akses Ditolak' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/errors/NotFoundView.vue'),
        meta: { title: 'Halaman Tidak Ditemukan' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Pulihkan sesi sekali di awal, sebelum keputusan apa pun diambil.
  if (auth.initialising) await auth.restore()

  if (to.meta.guest) {
    return auth.isAuthenticated ? { name: 'dashboard' } : true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  if (to.meta.roles?.length && !auth.hasRole(...to.meta.roles)) {
    return { name: 'forbidden' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} · SIMANTAP — Diskominfo Kab. Tangerang`
    : 'SIMANTAP — Diskominfo Kab. Tangerang'
})

export default router
