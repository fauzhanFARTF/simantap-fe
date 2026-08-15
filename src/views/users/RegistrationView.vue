<script setup lang="ts">
/** Verifikasi pendaftaran mandiri lewat akun Google. */
import { computed, onMounted } from 'vue'

import { registrationApi } from '@/api'
import HintBox from '@/components/common/HintBox.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { Paginated, RegistrationRow } from '@/types/models'
import { fmtDateTime, photoUrl } from '@/utils/format'

const auth = useAuthStore()

const { data, loading, run } = useAsync<Paginated<RegistrationRow>>(
  () => registrationApi.list(),
  { results: [], count: 0, page: 1, pages: 1, page_size: 0 },
)
const rows = computed(() => data.value.results)

/** Lencana menu ikut disegarkan supaya angkanya tidak basi setelah keputusan. */
async function refresh() {
  await run()
  auth.pendingRegistrations = (await registrationApi.pendingCount()).count
}

async function approve(row: RegistrationRow, again = false) {
  const message = again
    ? `Setujui ulang pendaftaran ${row.name}?`
    : `Setujui pendaftaran ${row.name} sebagai ${row.role_label}?`
  if (!(await confirmAction(message))) return
  if (await runAction(() => registrationApi.approve(row.uuid))) await refresh()
}

async function reject(row: RegistrationRow) {
  const confirmed = await confirmAction(
    `Tolak pendaftaran ${row.name}? Yang bersangkutan tidak akan bisa masuk.`,
  )
  if (!confirmed) return
  if (await runAction(() => registrationApi.reject(row.uuid))) await refresh()
}

onMounted(run)
</script>

<template>
  <PageHeader
    title="Verifikasi Pendaftaran"
    subtitle="Pendaftaran mandiri lewat akun Google yang menunggu persetujuan Administrator."
  />

  <div class="card-sb">
    <HintBox>
      Pendaftar <strong>belum bisa masuk</strong> sampai Anda menyetujui. Setelah disetujui, yang
      bersangkutan masuk lewat tombol <strong>Masuk dengan Google</strong> — mereka tidak punya
      password. Pendaftar yang ditolak tidak bisa masuk dan tidak bisa mendaftar ulang dengan akun
      Google yang sama.
    </HintBox>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="registrations-table">
        <thead>
          <tr>
            <th></th>
            <th>Nama</th>
            <th>Email</th>
            <th>Role Diminta</th>
            <th>Unit Kerja</th>
            <th>Telepon</th>
            <th>Mendaftar</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.uuid" :data-testid="`reg-row-${row.id}`">
            <td>
              <img
                :src="photoUrl(row.photo_url)"
                :alt="`Foto ${row.name}`"
                style="
                  width: 36px;
                  height: 36px;
                  object-fit: cover;
                  border-radius: 50%;
                  border: 1px solid var(--sb-line);
                "
              />
            </td>
            <td><strong>{{ row.name }}</strong></td>
            <td class="small">{{ row.email }}</td>
            <td><span class="badge bg-secondary">{{ row.role_label }}</span></td>
            <td class="small text-slate">{{ row.unit_kerja || '—' }}</td>
            <td class="small">{{ row.phone || '—' }}</td>
            <td class="small text-slate">{{ fmtDateTime(row.created_at) }}</td>
            <td>
              <span v-if="row.reg_status === 'pending'" class="badge bg-warning text-dark">
                Menunggu
              </span>
              <template v-else>
                <span class="badge bg-dark">Ditolak</span>
                <div v-if="row.verified_by_name" class="text-slate" style="font-size: 11px">
                  oleh {{ row.verified_by_name }}<br />{{ fmtDateTime(row.verified_at) }}
                </div>
              </template>
            </td>
            <td class="text-nowrap">
              <template v-if="row.reg_status === 'pending'">
                <button
                  class="btn btn-sm btn-primary"
                  :data-testid="`btn-approve-${row.id}`"
                  @click="approve(row)"
                >
                  <i class="fa-solid fa-check"></i> Setujui
                </button>
                <button
                  class="btn btn-sm btn-outline-danger ms-1"
                  :data-testid="`btn-reject-${row.id}`"
                  @click="reject(row)"
                >
                  <i class="fa-solid fa-xmark"></i> Tolak
                </button>
              </template>
              <button
                v-else
                class="btn btn-sm btn-outline-navy"
                :data-testid="`btn-reapprove-${row.id}`"
                @click="approve(row, true)"
              >
                <i class="fa-solid fa-rotate-left"></i> Setujui Ulang
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="9" class="text-center text-slate py-4">
              Tidak ada pendaftaran yang menunggu verifikasi.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
