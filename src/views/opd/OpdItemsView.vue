<script setup lang="ts">
/** Barang yang sedang berada di OPD lewat peminjaman Kebutuhan Jaringan. */
import { computed, onMounted, reactive, ref, toRef } from 'vue'

import { opdApi, superadminApi } from '@/api'
import HintBox from '@/components/common/HintBox.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useAuthStore } from '@/stores/auth'
import type { OpdItemRow } from '@/types/models'
import { fmtDate } from '@/utils/format'

const auth = useAuthStore()

const { data, loading, run } = useAsync(() => opdApi.list(), { results: [] as OpdItemRow[] })
const rows = computed(() => data.value.results)

const { query, filtered } = useLiveFilter(toRef(rows, 'value'), (row) =>
  [
    row.opd_name, row.asset_name, row.asset_code, row.bmn_number,
    row.brand ?? '', row.model ?? '', row.serial_number ?? '',
    row.requester_name, ...row.personnel,
  ].join(' '),
)

const canReturn = computed(() => auth.hasRole('admin_gudang', 'admin'))
const columnCount = computed(() => (canReturn.value ? 9 : 8))

// ── Modal: tarik barang dari OPD ─────────────────────────────────────────────
const returnTarget = ref<OpdItemRow | null>(null)
const returnForm = reactive({ condition: 'Damaged', note: '' })

const noteLabel = computed(() =>
  returnForm.condition === 'Good'
    ? 'Keterangan (opsional)'
    : returnForm.condition === 'Lost'
      ? 'Keterangan Kehilangan *'
      : 'Keterangan Kerusakan *',
)

function openReturn(row: OpdItemRow) {
  returnTarget.value = row
  returnForm.condition = 'Damaged'
  returnForm.note = ''
}

async function submitReturn() {
  const row = returnTarget.value
  if (!row) return
  const ok = await runAction(() =>
    opdApi.returnItem(row.id, { condition: returnForm.condition, note: returnForm.note }),
  )
  if (ok) {
    returnTarget.value = null
    await run()
  }
}

// ── Modal: ubah rencana (Super Admin) ────────────────────────────────────────
const editTarget = ref<OpdItemRow | null>(null)
const editForm = reactive({ will_return: false, expected_return_date: '' })

function openEdit(row: OpdItemRow) {
  editTarget.value = row
  editForm.will_return = row.will_return
  editForm.expected_return_date = row.expected_return_date ?? ''
}

async function submitEdit() {
  const row = editTarget.value
  if (!row) return
  const ok = await runAction(() =>
    superadminApi.editOpdItem(row.id, {
      will_return: editForm.will_return,
      expected_return_date: editForm.will_return ? editForm.expected_return_date : undefined,
    }),
  )
  if (ok) {
    editTarget.value = null
    await run()
  }
}

async function removeFromOpd(row: OpdItemRow) {
  const confirmed = await confirmAction(
    `Hapus "${row.asset_name}" dari OPD ${row.opd_name}? Barang dilepas dari acara dan alat ` +
      'kembali Tersedia.',
  )
  if (!confirmed) return
  if (await runAction(() => superadminApi.deleteOpdItem(row.id))) await run()
}

onMounted(run)
</script>

<template>
  <PageHeader title="Barang di OPD">
    <template #actions>
      <RouterLink to="/dashboard" class="btn btn-outline-navy">
        <i class="fa-solid fa-arrow-left"></i> Kembali
      </RouterLink>
    </template>
  </PageHeader>
  <p class="subtitle" style="margin-top: -14px">
    Barang yang keluar lewat peminjaman <strong>Kebutuhan Jaringan</strong> dan sedang berada di
    OPD.
  </p>

  <HintBox class="mb-3">
    Barang berstatus <span class="badge bg-info text-dark">Di OPD</span> masih
    <strong>menunggu</strong> — tetap milik Diskominfo dan dikembalikan hanya bila
    <strong>rusak</strong> (atau ditarik). Barang ini tidak digabung dengan alat lain di menu
    Pengembalian; tarik lewat tombol di baris masing-masing. Barang
    <span class="badge bg-primary">Dipinjam</span> dikembalikan berjadwal lewat menu Pengembalian
    biasa.
  </HintBox>

  <div class="card-sb">
    <div class="row g-2 mb-3">
      <div class="col-md-8">
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Cari OPD, nama barang, kode, atau SN..."
          autocomplete="off"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center text-slate py-4">Memuat data…</div>

    <div v-else class="table-responsive">
      <table class="table table-sb align-middle" data-testid="opd-items-table">
        <thead>
          <tr>
            <th>OPD</th>
            <th>Nama Barang</th>
            <th>Kode</th>
            <th>Model / SN</th>
            <th>Tgl Pemasangan</th>
            <th>Penanggung Jawab</th>
            <th>Personel</th>
            <th>Status</th>
            <th v-if="canReturn"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :key="row.id">
            <td>
              <RouterLink
                :to="`/loans/${row.loan_uuid}`"
                class="fw-semibold text-decoration-none"
              >
                {{ row.opd_name }}
              </RouterLink>
              <div class="text-slate small text-mono">{{ row.loan_code }}</div>
            </td>
            <td>{{ row.asset_name }}</td>
            <td class="text-mono small">
              {{ row.asset_code }}
              <div v-if="row.bmn_number" class="text-slate">No. DISKOMINFO: {{ row.bmn_number }}</div>
            </td>
            <td class="small">
              <template v-if="row.brand || row.model">
                {{ [row.brand, row.model].filter(Boolean).join(' ') }}
              </template>
              <span v-else class="text-slate">—</span>
              <div v-if="row.serial_number" class="text-slate text-mono">
                SN: {{ row.serial_number }}
              </div>
            </td>
            <td class="small">
              <template v-if="row.checkout_at">{{ fmtDate(row.checkout_at) }}</template>
              <span v-else class="text-slate">—</span>
            </td>
            <td class="small">{{ row.requester_name }}</td>
            <td class="small">
              <template v-if="row.personnel.length">{{ row.personnel.join(', ') }}</template>
              <span v-else class="text-slate">—</span>
            </td>
            <td>
              <template v-if="row.item_status === 'AtOpd'">
                <span class="badge bg-info text-dark">Di OPD</span>
                <div class="text-slate small mt-1">menunggu (kembali bila rusak)</div>
              </template>
              <template v-else>
                <span class="badge bg-primary">Dipinjam</span>
                <div v-if="row.expected_return_date" class="text-slate small mt-1">
                  rencana {{ fmtDate(row.expected_return_date) }}
                </div>
              </template>
            </td>
            <td v-if="canReturn" class="text-nowrap">
              <div class="d-flex gap-1">
                <button
                  v-if="row.item_status === 'AtOpd'"
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  :data-testid="`btn-return-opd-${row.id}`"
                  @click="openReturn(row)"
                >
                  <i class="fa-solid fa-rotate-left"></i> Kembalikan
                </button>
                <span v-else class="text-slate small align-self-center">lewat Pengembalian</span>

                <template v-if="auth.isSuperadmin">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-navy"
                    title="Ubah rencana (Super Admin)"
                    :data-testid="`btn-edit-opd-${row.id}`"
                    @click="openEdit(row)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    title="Hapus dari OPD (Super Admin)"
                    :data-testid="`btn-delete-opd-${row.id}`"
                    @click="removeFromOpd(row)"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="columnCount" class="text-center text-slate py-4">
              {{
                rows.length
                  ? 'Tidak ada barang yang cocok dengan pencarian.'
                  : 'Belum ada barang yang berada di OPD.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tarik barang dari OPD -->
  <div
    v-if="returnTarget"
    class="modal fade show d-block"
    tabindex="-1"
    style="background: rgba(15, 23, 42, 0.5)"
  >
    <div class="modal-dialog">
      <form class="modal-content" data-testid="return-opd-form" @submit.prevent="submitReturn">
        <div class="modal-header">
          <h5 class="modal-title">Kembalikan Barang dari OPD</h5>
          <button type="button" class="btn-close" @click="returnTarget = null"></button>
        </div>
        <div class="modal-body">
          <p class="mb-3">
            Menarik <strong>{{ returnTarget.asset_name }}</strong> dari
            <strong>{{ returnTarget.opd_name }}</strong
            >. Pilih kondisi barang saat ditarik.
          </p>
          <label class="form-label" for="opdCondition">Kondisi <span class="req">*</span></label>
          <select
            id="opdCondition"
            v-model="returnForm.condition"
            class="form-select mb-3"
            data-testid="return-opd-condition"
          >
            <option value="Damaged">Rusak — perlu perbaikan</option>
            <option value="Good">Baik — ditarik / dikembalikan</option>
            <option value="Lost">Hilang</option>
          </select>
          <label class="form-label" for="opdNote">{{ noteLabel }}</label>
          <textarea
            id="opdNote"
            v-model="returnForm.note"
            class="form-control"
            rows="3"
            placeholder="Jelaskan kerusakan / kondisi barang"
            data-testid="return-opd-note"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-navy" @click="returnTarget = null">
            Batal
          </button>
          <button type="submit" class="btn btn-danger" data-testid="btn-return-opd-confirm">
            <i class="fa-solid fa-rotate-left"></i> Proses
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Ubah rencana barang (Super Admin) -->
  <div
    v-if="editTarget"
    class="modal fade show d-block"
    tabindex="-1"
    style="background: rgba(15, 23, 42, 0.5)"
  >
    <div class="modal-dialog">
      <form class="modal-content" data-testid="edit-opd-form" @submit.prevent="submitEdit">
        <div class="modal-header">
          <h5 class="modal-title">Ubah Rencana Barang</h5>
          <button type="button" class="btn-close" @click="editTarget = null"></button>
        </div>
        <div class="modal-body">
          <p class="mb-3">
            Barang: <strong>{{ editTarget.asset_name }}</strong>
          </p>
          <div class="form-check mb-2">
            <input
              id="editOpdWillReturn"
              v-model="editForm.will_return"
              class="form-check-input"
              type="checkbox"
              data-testid="edit-opd-will-return"
            />
            <label class="form-check-label" for="editOpdWillReturn">
              <strong>Barang akan dikembalikan?</strong>
            </label>
          </div>
          <div v-if="editForm.will_return">
            <label class="form-label" for="editOpdDate">
              Rencana Tanggal Kembali <span class="req">*</span>
            </label>
            <input
              id="editOpdDate"
              v-model="editForm.expected_return_date"
              type="date"
              class="form-control"
              required
              data-testid="edit-opd-date"
            />
          </div>
          <div class="form-text mt-2">
            Dicentang → barang berstatus <strong>Dipinjam</strong> dan masuk menu Pengembalian.
            Tidak dicentang → berstatus <strong>Di OPD</strong> (menunggu, kembali bila rusak).
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-navy" @click="editTarget = null">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" data-testid="btn-edit-opd-save">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
