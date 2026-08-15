<script setup lang="ts">
/** Detail peminjaman: ringkasan, daftar alat, dan aksi sesuai peran & status. */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { loanApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import HintBox from '@/components/common/HintBox.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DecisionModal from '@/components/loans/DecisionModal.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { LoanDetail, LoanItem } from '@/types/models'
import { fmtDate, fmtDateTime, fmtTime, photoUrl } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const uuid = String(route.params.uuid)
const { data: loan, loading, error, run } = useAsync<LoanDetail | null>(
  () => loanApi.detail(uuid),
  null,
)

const decision = ref<'approve' | 'reject' | null>(null)
const editingName = ref(false)
const nameDraft = ref('')

const isOpd = computed(() => loan.value?.loan_type === 'opd')
const items = computed(() => loan.value?.items ?? [])

/** Barang OPD dipisah: yang ditunggu kembali vs yang menetap di OPD. */
const opdReturning = computed(() => items.value.filter((item) => item.will_return))
const opdStaying = computed(() => items.value.filter((item) => !item.will_return))
const opdLatestReturn = computed(() => {
  const dates = opdReturning.value
    .map((item) => item.expected_return_date)
    .filter((date): date is string => Boolean(date))
  return dates.length ? dates.sort().at(-1) : null
})

const canDecide = computed(
  () => loan.value?.status === 'Pending' && auth.hasRole('supervisor', 'admin'),
)
const canEditItems = computed(
  () =>
    !!loan.value &&
    ['Pending', 'Approved'].includes(loan.value.status) &&
    (auth.hasRole('admin') || loan.value.is_mine),
)
const canPrintBeritaAcara = computed(
  () =>
    !!loan.value &&
    ['Approved', 'CheckedOut', 'Returned', 'Completed'].includes(loan.value.status) &&
    auth.hasRole('admin_gudang', 'admin'),
)
const participantNames = computed(() => loan.value?.participants.join(', ') ?? '')

function startEditName() {
  nameDraft.value = loan.value?.event_name ?? ''
  editingName.value = true
}

async function saveName() {
  if (!nameDraft.value.trim()) return
  if (await runAction(() => loanApi.editName(uuid, nameDraft.value.trim()))) {
    editingName.value = false
    await run()
  }
}

async function decide(note: string) {
  const action = decision.value
  if (!action) return
  const call = action === 'approve' ? loanApi.approve : loanApi.reject
  if (await runAction(() => call(uuid, note))) {
    decision.value = null
    await run()
  }
}

async function cancelLoan() {
  if (!(await confirmAction('Batalkan peminjaman ini?'))) return
  if (await runAction(() => loanApi.cancel(uuid))) await run()
}

async function removeItem(item: LoanItem) {
  const confirmed = await confirmAction(
    `Batalkan alat "${item.asset_name}" dari peminjaman ini?`,
  )
  if (!confirmed) return
  const result = await runAction(() => loanApi.removeItem(uuid, item.id), {
    onSuccess: (response) => {
      if (response.loan_cancelled) void router.push('/loans')
    },
  })
  if (result) await run()
}

async function deleteLoan() {
  const confirmed = await confirmAction(
    `Hapus PERMANEN acara ${loan.value?.loan_code}? Alat yang terkait dikembalikan ke ` +
      'Tersedia. Tindakan ini TIDAK BISA dibatalkan.',
  )
  if (!confirmed) return
  if (await runAction(() => loanApi.remove(uuid))) await router.push('/loans')
}

onMounted(run)
</script>

<template>
  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat detail peminjaman…</div>
  <div v-else-if="error || !loan" class="alert alert-danger">
    {{ error ?? 'Peminjaman tidak ditemukan.' }}
  </div>

  <template v-else>
    <div class="page-header">
      <div>
        <h1>
          Peminjaman
          <span class="text-mono text-slate" style="font-size: 16px">{{ loan.loan_code }}</span>
          <span
            v-if="isOpd"
            class="badge bg-info text-dark align-middle"
            style="font-size: 11px"
          >
            Kebutuhan Jaringan
          </span>
        </h1>
        <p class="subtitle">
          <template v-if="isOpd">OPD: </template>
          <span data-testid="loan-name-text" :style="{ opacity: editingName ? 0.5 : undefined }">
            {{ loan.event_name }}
          </span>
          <button
            v-if="auth.isSuperadmin && !editingName"
            type="button"
            class="btn btn-sm btn-outline-navy py-0 px-1 ms-1"
            title="Ubah nama"
            data-testid="btn-edit-name"
            @click="startEditName"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
        </p>

        <form
          v-if="editingName"
          class="mb-2"
          data-testid="edit-name-form"
          @submit.prevent="saveName"
        >
          <div class="input-group" style="max-width: 520px">
            <input
              v-model="nameDraft"
              type="text"
              class="form-control"
              required
              maxlength="200"
              data-testid="input-event-name"
            />
            <button class="btn btn-primary" type="submit" data-testid="btn-save-name">
              <i class="fa-solid fa-floppy-disk"></i> Simpan
            </button>
            <button class="btn btn-outline-navy" type="button" @click="editingName = false">
              Batal
            </button>
          </div>
        </form>

        <AuditTrailInfo :record="loan" />
      </div>

      <div class="d-flex gap-2 flex-wrap">
        <RouterLink to="/loans" class="btn btn-outline-navy">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </RouterLink>

        <template v-if="canDecide">
          <button class="btn btn-success" data-testid="btn-approve" @click="decision = 'approve'">
            <i class="fa-solid fa-check"></i> Setujui
          </button>
          <button class="btn btn-danger" data-testid="btn-reject" @click="decision = 'reject'">
            <i class="fa-solid fa-xmark"></i> Tolak
          </button>
        </template>

        <button
          v-if="canEditItems"
          class="btn btn-outline-navy"
          data-testid="btn-cancel-loan"
          @click="cancelLoan"
        >
          <i class="fa-solid fa-ban"></i> Batalkan
        </button>

        <RouterLink
          v-if="loan.status === 'Approved' && auth.hasRole('admin_gudang', 'admin')"
          :to="`/checkout/${loan.uuid}`"
          class="btn btn-amber"
          data-testid="btn-goto-checkout"
        >
          <i class="fa-solid fa-arrow-right-from-bracket"></i> Penyerahan Sekarang
        </RouterLink>

        <RouterLink
          v-if="loan.status === 'CheckedOut' && auth.hasRole('admin_gudang', 'admin')"
          :to="`/checkin/${loan.uuid}`"
          class="btn btn-amber"
          data-testid="btn-goto-checkin"
        >
          <i class="fa-solid fa-arrow-right-to-bracket"></i> Pengembalian Sekarang
        </RouterLink>

        <a
          v-if="canPrintBeritaAcara"
          :href="`/loans/${loan.uuid}/berita-acara`"
          target="_blank"
          class="btn btn-outline-navy"
          data-testid="btn-berita-acara"
        >
          <i class="fa-solid fa-file-lines"></i>
          {{ isOpd ? 'Berita Acara Serah Terima' : 'Berita Acara Keluar' }}
        </a>

        <button
          v-if="auth.isSuperadmin"
          class="btn btn-outline-danger"
          data-testid="btn-delete-loan"
          @click="deleteLoan"
        >
          <i class="fa-solid fa-trash"></i> Hapus Acara
        </button>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card-sb">
          <div class="card-title">Ringkasan</div>
          <table class="table table-sm mb-0">
            <tbody>
              <tr>
                <td class="text-slate">Status</td>
                <td><StatusBadge :status="loan.status" :label="loan.status_label" /></td>
              </tr>
              <tr>
                <td class="text-slate">Pemohon</td>
                <td>
                  {{ loan.requester_name }}<br />
                  <span class="small text-slate">{{ loan.requester_unit }}</span>
                </td>
              </tr>

              <template v-if="isOpd">
                <tr>
                  <td class="text-slate">Tanggal Pinjam</td>
                  <td>{{ fmtDate(loan.start_date) }}</td>
                </tr>
                <tr>
                  <td class="text-slate">Pengembalian</td>
                  <td>
                    <div v-if="opdReturning.length">
                      <span class="badge bg-info text-dark">Dikembalikan</span>
                      {{ opdReturning.length }} barang
                      <template v-if="opdLatestReturn">
                        · paling lambat <strong>{{ fmtDate(opdLatestReturn) }}</strong>
                      </template>
                    </div>
                    <div v-if="opdStaying.length" class="mt-1">
                      <span class="badge bg-secondary">Tetap di OPD</span>
                      {{ opdStaying.length }} barang
                      <span class="small text-slate">tanpa batas waktu</span>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td class="text-slate">Tanggal</td>
                <td>{{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}</td>
              </tr>

              <tr v-if="loan.start_time">
                <td class="text-slate">Jam Acara</td>
                <td>{{ fmtTime(loan.start_time) }}</td>
              </tr>
              <tr>
                <td class="text-slate">Lokasi</td>
                <td>{{ loan.event_location || '—' }}</td>
              </tr>
              <tr>
                <td class="text-slate">Personel</td>
                <td>
                  <template v-if="loan.participant_details.length">
                    <div v-for="person in loan.participant_details" :key="person.uuid">
                      {{ person.name }}
                      <span v-if="person.unit_kerja" class="small text-slate">
                        · {{ person.unit_kerja }}
                      </span>
                    </div>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
              <tr>
                <td class="text-slate">Tujuan</td>
                <td style="white-space: pre-line">{{ loan.purpose || '—' }}</td>
              </tr>
              <tr>
                <td class="text-slate">Diajukan</td>
                <td>{{ fmtDateTime(loan.created_at) }}</td>
              </tr>
              <tr v-if="loan.approved_at">
                <td class="text-slate">Keputusan</td>
                <td>
                  {{ fmtDateTime(loan.approved_at) }}<br />
                  <span class="small text-slate">oleh {{ loan.supervisor_name }}</span>
                </td>
              </tr>
              <tr v-if="loan.approval_note">
                <td class="text-slate">Catatan Approval</td>
                <td style="white-space: pre-line">{{ loan.approval_note }}</td>
              </tr>
              <tr v-if="loan.checkout_at">
                <td class="text-slate">Penyerahan</td>
                <td>{{ fmtDateTime(loan.checkout_at) }}</td>
              </tr>
              <tr v-if="loan.checkin_at">
                <td class="text-slate">Pengembalian</td>
                <td>{{ fmtDateTime(loan.checkin_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card-sb">
          <div class="card-title">Daftar Alat ({{ items.length }})</div>

          <HintBox v-if="canEditItems && items.length > 1" class="mb-2">
            Anda dapat membatalkan salah satu alat tanpa membatalkan seluruh peminjaman. Jika hanya
            tersisa satu alat lalu dihapus, peminjaman akan dibatalkan otomatis.
          </HintBox>

          <div class="table-responsive">
            <table class="table table-sb align-middle" data-testid="loan-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foto</th>
                  <th>Alat</th>
                  <th>Status Item</th>
                  <th>Peminjam</th>
                  <th v-if="canEditItems"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in items" :key="item.id">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <a :href="photoUrl(item.photo_url)" target="_blank" title="Lihat foto">
                      <img
                        :src="photoUrl(item.photo_url)"
                        :alt="`Foto ${item.asset_name}`"
                        style="
                          width: 44px;
                          height: 44px;
                          object-fit: cover;
                          border-radius: 8px;
                          border: 1px solid var(--sb-line);
                          background: #fff;
                        "
                      />
                    </a>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ item.asset_name }}</div>
                    <div class="text-slate small text-mono">{{ item.asset_code }}</div>
                    <div v-if="item.category_name" class="text-slate small">
                      {{ item.category_name }}
                    </div>
                    <div v-if="item.brand || item.model" class="text-slate small">
                      {{ [item.brand, item.model].filter(Boolean).join(' ') }}
                    </div>
                    <div v-if="item.serial_number" class="text-slate small text-mono">
                      SN: {{ item.serial_number }}
                    </div>
                  </td>
                  <td>
                    <StatusBadge :status="item.item_status" :label="item.item_status_label" />
                    <template v-if="isOpd">
                      <div v-if="item.will_return" class="small text-slate mt-1">
                        <i class="fa-solid fa-rotate-left me-1"></i>Dikembalikan
                        <template v-if="item.expected_return_date">
                          · {{ fmtDate(item.expected_return_date) }}
                        </template>
                      </div>
                      <div v-else class="small text-slate mt-1">
                        <i class="fa-solid fa-building-columns me-1"></i>Tetap di OPD
                      </div>
                    </template>
                  </td>
                  <td class="small">
                    <div>
                      <i class="fa-solid fa-user me-1 text-slate"></i>{{ loan.requester_name }}
                    </div>
                    <div v-if="participantNames" class="text-slate">
                      <i class="fa-solid fa-users me-1"></i>{{ participantNames }}
                    </div>
                  </td>
                  <td v-if="canEditItems" class="text-nowrap">
                    <button
                      v-if="item.item_status === 'Reserved'"
                      class="btn btn-sm btn-outline-danger"
                      title="Batalkan alat ini"
                      :data-testid="`btn-remove-item-${item.id}`"
                      @click="removeItem(item)"
                    >
                      <i class="fa-solid fa-xmark"></i> Batalkan
                    </button>
                    <span v-else class="text-slate small">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <DecisionModal
      v-if="decision"
      :mode="decision"
      :loan-code="loan.loan_code"
      @close="decision = null"
      @submit="decide"
    />
  </template>
</template>
