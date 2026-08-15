<script setup lang="ts">
/** Detail tiket perbaikan: cetak SPK, tutup tiket, koreksi oleh Super Admin. */
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'

import { repairApi, superadminApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { runAction, useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { RepairDetail } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const REPAIR_STATUSES = [
  { value: 'Open', label: 'Baru' },
  { value: 'FormPrinted', label: 'SPK Dicetak' },
  { value: 'InRepair', label: 'Diperbaiki' },
  { value: 'Completed', label: 'Selesai' },
]

const route = useRoute()
const auth = useAuthStore()

const uuid = String(route.params.uuid)
const { data: repair, loading, error, run } = useAsync<RepairDetail | null>(
  () => repairApi.detail(uuid),
  null,
)

const completeForm = reactive({ technician_name: '', action_taken: '' })
const editForm = reactive({ complaint: '', status: 'Open' })

const isCompleted = computed(() => repair.value?.status === 'Completed')
const brandModel = computed(() =>
  [repair.value?.brand, repair.value?.model].filter(Boolean).join(' ') || '—',
)

// Form koreksi Super Admin selalu berisi nilai terkini, bukan kosong.
watch(repair, (value) => {
  if (!value) return
  editForm.complaint = value.complaint
  editForm.status = value.status
})

async function complete() {
  if (await runAction(() => repairApi.complete(uuid, { ...completeForm }))) await run()
}

async function saveEdit() {
  if (await runAction(() => superadminApi.editRepair(uuid, { ...editForm }))) await run()
}

onMounted(run)
</script>

<template>
  <div v-if="loading" class="card-sb text-center py-5 text-slate">Memuat detail perbaikan…</div>
  <div v-else-if="error || !repair" class="alert alert-danger">
    {{ error ?? 'Data perbaikan tidak ditemukan.' }}
  </div>

  <template v-else>
    <div class="page-header">
      <div>
        <h1>
          Perbaikan
          <span class="text-mono text-slate" style="font-size: 16px">{{ repair.repair_code }}</span>
        </h1>
        <p class="subtitle">{{ repair.asset_name }} · {{ repair.bmn_number }}</p>
        <AuditTrailInfo :record="repair" />
      </div>
      <div class="d-flex gap-2">
        <RouterLink to="/repairs" class="btn btn-outline-navy">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </RouterLink>
        <a
          :href="`/repairs/${repair.uuid}/print`"
          target="_blank"
          class="btn btn-amber"
          data-testid="btn-print-spk"
        >
          <i class="fa-solid fa-print"></i> Cetak SPK
        </a>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card-sb">
          <div class="card-title">Detail Kerusakan</div>
          <table class="table table-sm">
            <tbody>
              <tr>
                <td class="text-slate">Status</td>
                <td><StatusBadge :status="repair.status" :label="repair.status_label" /></td>
              </tr>
              <tr>
                <td class="text-slate">Kode Repair</td>
                <td class="text-mono">{{ repair.repair_code }}</td>
              </tr>
              <tr>
                <td class="text-slate">Aset</td>
                <td>{{ repair.asset_name }} ({{ repair.asset_code }})</td>
              </tr>
              <tr>
                <td class="text-slate">No. DISKOMINFO</td>
                <td class="text-mono">{{ repair.bmn_number }}</td>
              </tr>
              <tr>
                <td class="text-slate">Brand / Model</td>
                <td>{{ brandModel }}</td>
              </tr>
              <tr>
                <td class="text-slate">Serial</td>
                <td class="text-mono">{{ repair.serial_number || '—' }}</td>
              </tr>
              <tr>
                <td class="text-slate">Loan Sumber</td>
                <td>
                  {{ repair.loan_code || '—'
                  }}<template v-if="repair.requester_name"> · {{ repair.requester_name }}</template>
                </td>
              </tr>
              <tr>
                <td class="text-slate">Dibuat</td>
                <td>{{ fmtDateTime(repair.created_at) }}</td>
              </tr>
              <tr v-if="repair.form_printed_at">
                <td class="text-slate">SPK Dicetak</td>
                <td>{{ fmtDateTime(repair.form_printed_at) }}</td>
              </tr>
              <tr v-if="repair.completed_at">
                <td class="text-slate">Ditutup</td>
                <td>
                  {{ fmtDateTime(repair.completed_at) }} oleh {{ repair.completed_by_name }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="alert alert-warning mb-0">
            <strong>Keluhan:</strong><br />
            <span style="white-space: pre-line">{{ repair.complaint }}</span>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div v-if="isCompleted" class="card-sb">
          <div class="card-title">Hasil Perbaikan</div>
          <p class="mb-2"><strong>Teknisi:</strong> {{ repair.technician_name }}</p>
          <p><strong>Tindakan:</strong></p>
          <div class="alert alert-info mb-0" style="white-space: pre-line">
            {{ repair.action_taken }}
          </div>
        </div>

        <div v-else class="card-sb">
          <div class="card-title">Tutup Perbaikan</div>
          <p class="text-slate small">
            Isi form ini setelah menerima kembali alat + Formulir Perbaikan (kertas) yang telah
            ditandatangani teknisi. Status aset akan otomatis kembali ke
            <strong>Tersedia</strong>.
          </p>
          <form data-testid="repair-complete-form" @submit.prevent="complete">
            <div class="mb-3">
              <label class="form-label" for="techName">
                Nama Teknisi <span class="req">*</span>
              </label>
              <input
                id="techName"
                v-model="completeForm.technician_name"
                type="text"
                class="form-control"
                required
                placeholder="mis. Rian Hidayat"
                data-testid="input-technician"
              />
            </div>
            <div class="mb-3">
              <label class="form-label" for="actionTaken">
                Tindakan Perbaikan (salin dari kertas SPK) <span class="req">*</span>
              </label>
              <textarea
                id="actionTaken"
                v-model="completeForm.action_taken"
                class="form-control"
                rows="6"
                required
                placeholder="Jelaskan tindakan yang dilakukan teknisi..."
                data-testid="input-action"
              ></textarea>
            </div>
            <button class="btn btn-primary w-100" data-testid="btn-complete-repair">
              <i class="fa-solid fa-check"></i> Tutup Perbaikan &amp; Set Tersedia
            </button>
          </form>
        </div>

        <div v-if="auth.isSuperadmin" class="card-sb mt-3" data-testid="repair-superadmin-edit">
          <div class="card-title">
            <i class="fa-solid fa-pen me-2 text-slate"></i>Koreksi Data (Super Admin)
          </div>
          <p class="text-slate small">
            Perbaiki keluhan atau status yang salah input. Status alat ikut menyesuaikan:
            <strong>Selesai</strong> mengembalikan alat ke Tersedia, status lain menandai alat
            Rusak.
          </p>
          <form data-testid="repair-edit-form" @submit.prevent="saveEdit">
            <div class="mb-3">
              <label class="form-label" for="editComplaint">Keluhan <span class="req">*</span></label>
              <textarea
                id="editComplaint"
                v-model="editForm.complaint"
                class="form-control"
                rows="4"
                required
                data-testid="input-edit-complaint"
              ></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label" for="editStatus">Status <span class="req">*</span></label>
              <select
                id="editStatus"
                v-model="editForm.status"
                class="form-select"
                data-testid="input-edit-status"
              >
                <option v-for="status in REPAIR_STATUSES" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>
            <button class="btn btn-primary w-100" data-testid="btn-edit-repair">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Koreksi
            </button>
          </form>
        </div>
      </div>
    </div>
  </template>
</template>
