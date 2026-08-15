<script setup lang="ts">
/** Manajemen User — daftar akun beserta peran & statusnya. */
import { computed, onMounted, ref, toRef } from 'vue'

import { userApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import ResetButton from '@/components/common/ResetButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { Paginated, Role, UserListItem } from '@/types/models'
import { photoUrl } from '@/utils/format'

/** Urutan sengaja mengikuti aplikasi lama: paling berwenang di atas. */
const ROLE_FILTERS: { value: Role; label: string }[] = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrator' },
  { value: 'administrator_pembantu_manajemen_user', label: 'Administrator Pembantu — Manajemen User' },
  { value: 'administrator_pembantu_manajemen_alat', label: 'Administrator Pembantu — Manajemen Alat' },
  { value: 'administrator_pembantu_manajemen_kategori', label: 'Administrator Pembantu — Manajemen Kategori' },
  { value: 'admin_gudang', label: 'Admin Gudang' },
  { value: 'inventory_staff', label: 'IT Staff' },
  { value: 'supervisor', label: 'Staff Approval' },
  { value: 'pimpinan', label: 'Pimpinan' },
  { value: 'pemohon', label: 'Personel Luar' },
]

const auth = useAuthStore()

const { data, loading, run } = useAsync<Paginated<UserListItem>>(() => userApi.list(), {
  results: [], count: 0, page: 1, pages: 1, page_size: 0,
})
const users = computed(() => data.value.results)

const roleFilter = ref('')
const activeFilter = ref('')

const { query, filtered } = useLiveFilter(toRef(users, 'value'), (user) =>
  [user.name, user.email, user.unit_kerja ?? '', user.phone ?? ''].join(' '),
)

const visible = computed(() =>
  filtered.value.filter(
    (user) =>
      (!roleFilter.value || user.role === roleFilter.value) &&
      (!activeFilter.value || String(Number(user.is_active)) === activeFilter.value),
  ),
)

/** Akun Super Admin hanya boleh dikelola sesama Super Admin. */
const canManage = (user: UserListItem) => user.role !== 'superadmin' || auth.isSuperadmin

async function toggle(user: UserListItem) {
  if (!(await confirmAction('Ubah status user ini?'))) return
  if (await runAction(() => userApi.toggle(user.uuid))) await run()
}

async function remove(user: UserListItem) {
  const confirmed = await confirmAction(
    'Hapus user ini? (masih bisa dipulihkan lewat Riwayat Terhapus)',
  )
  if (!confirmed) return
  if (await runAction(() => userApi.remove(user.uuid))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader
    title="Manajemen User"
    subtitle="Kelola akun pengguna sistem beserta hak akses (role)."
  >
    <template #actions>
      <RouterLink to="/users/create" class="btn btn-amber" data-testid="btn-new-user">
        <i class="fa-solid fa-user-plus"></i> Tambah User
      </RouterLink>
      <ResetButton
        scope="users"
        label="Reset User"
        confirm="RESET SEMUA user? Semua akun dihapus PERMANEN kecuali Super Admin. Peminjaman & notifikasi terkait ikut terhapus. Tindakan ini TIDAK BISA dibatalkan."
        @done="run"
      />
    </template>
  </PageHeader>

  <div class="card-sb">
    <div class="row g-2 mb-3">
      <div class="col-md-5">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari nama, email, atau unit kerja... (langsung tampil)"
          data-testid="search-input"
        />
      </div>
      <div class="col-md-4">
        <select v-model="roleFilter" class="form-select">
          <option value="">— Semua Role —</option>
          <option v-for="role in ROLE_FILTERS" :key="role.value" :value="role.value">
            {{ role.label }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <select v-model="activeFilter" class="form-select">
          <option value="">— Semua Status —</option>
          <option value="1">Aktif</option>
          <option value="0">Nonaktif</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="users-table">
        <thead>
          <tr>
            <th></th>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Unit Kerja</th>
            <th>Telepon</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in visible" :key="user.uuid">
            <td>
              <img
                :src="photoUrl(user.photo_url)"
                :alt="`Foto ${user.name}`"
                style="
                  width: 36px;
                  height: 36px;
                  object-fit: cover;
                  border-radius: 50%;
                  border: 1px solid var(--sb-line);
                "
              />
            </td>
            <td><strong>{{ user.name }}</strong></td>
            <td class="small">{{ user.email }}</td>
            <td>
              <div class="d-flex flex-column align-items-start gap-1">
                <span class="badge bg-secondary text-wrap text-start">{{ user.role_label }}</span>
                <span
                  v-for="extra in user.extra_roles"
                  :key="extra.value"
                  class="badge bg-info text-dark text-wrap text-start"
                >
                  {{ extra.label }}
                </span>
              </div>
            </td>
            <td class="small text-slate">{{ user.unit_kerja || '—' }}</td>
            <td class="small">{{ user.phone || '—' }}</td>
            <td>
              <span v-if="user.is_active" class="badge bg-success">Aktif</span>
              <span v-else class="badge bg-dark">Nonaktif</span>
            </td>
            <td class="text-nowrap">
              <template v-if="canManage(user)">
                <RouterLink
                  :to="`/users/${user.uuid}/edit`"
                  class="btn btn-sm btn-outline-navy"
                  :data-testid="`btn-edit-user-${user.id}`"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </RouterLink>
                <button class="btn btn-sm btn-outline-danger ms-1" @click="toggle(user)">
                  <i class="fa-solid fa-power-off"></i>
                </button>
                <button
                  v-if="user.id !== auth.user?.id"
                  class="btn btn-sm btn-outline-danger ms-1"
                  :data-testid="`btn-delete-user-${user.id}`"
                  @click="remove(user)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </template>
              <span v-else class="text-slate small"><i class="fa-solid fa-lock"></i></span>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td colspan="8" class="text-center text-slate py-4">
              Tidak ada user yang cocok dengan pencarian / filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
