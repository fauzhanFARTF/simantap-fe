<script setup lang="ts">
/**
 * Modal setujui / tolak peminjaman.
 *
 * Penolakan mewajibkan alasan — pemohon perlu tahu apa yang harus diperbaiki,
 * bukan sekadar bahwa pengajuannya gagal.
 */
import { ref } from 'vue'

const props = defineProps<{ mode: 'approve' | 'reject'; loanCode: string }>()
const emit = defineEmits<{ close: []; submit: [note: string] }>()

const note = ref('')
const isReject = props.mode === 'reject'

function submit() {
  if (isReject && !note.value.trim()) return
  emit('submit', note.value.trim())
}
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.5)">
    <div class="modal-dialog">
      <form
        class="modal-content"
        :data-testid="isReject ? 'reject-form' : 'approve-form'"
        @submit.prevent="submit"
      >
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isReject ? 'Tolak Peminjaman' : 'Setujui Peminjaman' }}
          </h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <p v-if="isReject">
            Anda akan menolak pengajuan <strong>{{ loanCode }}</strong
            >.
          </p>
          <p v-else>
            Konfirmasi persetujuan atas <strong>{{ loanCode }}</strong
            >.
          </p>
          <label class="form-label" for="decisionNote">
            {{ isReject ? 'Alasan Penolakan' : 'Catatan (opsional)' }}
            <span v-if="isReject" class="req">*</span>
          </label>
          <textarea
            id="decisionNote"
            v-model="note"
            class="form-control"
            rows="3"
            :required="isReject"
            :data-testid="isReject ? 'reject-note' : 'approve-note'"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-navy" type="button" @click="emit('close')">Batal</button>
          <button
            class="btn"
            :class="isReject ? 'btn-danger' : 'btn-success'"
            type="submit"
            :data-testid="isReject ? 'btn-reject-confirm' : 'btn-approve-confirm'"
          >
            <i :class="isReject ? 'fa-solid fa-xmark' : 'fa-solid fa-check'"></i>
            {{ isReject ? 'Tolak' : 'Setujui' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
