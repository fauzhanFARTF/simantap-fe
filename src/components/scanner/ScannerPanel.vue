<script setup lang="ts">
/**
 * Panel pindai: kamera + isian manual + log hasil.
 *
 * Isian manual bukan sekadar cadangan — di gudang, pemindai QR USB/Bluetooth
 * mengetik kodenya lalu menekan Enter, jadi jalur inilah yang paling sering
 * dipakai di meja. Karena itu fokusnya dikembalikan ke kolom itu setiap selesai.
 */
import { nextTick, onMounted, ref } from 'vue'

import { useQrScanner } from '@/composables/useQrScanner'

const props = defineProps<{ hint: string; introLog: string }>()
const emit = defineEmits<{ scan: [code: string] }>()

export interface LogLine {
  id: number
  type: 'ok' | 'err' | 'info'
  text: string
}

const lines = ref<LogLine[]>([])
/** Diekspos ke induk: halaman Pengembalian memantaunya untuk mendeteksi alat
 *  berstok begitu kodenya diketik, sebelum QR-nya dikirim. */
const manual = defineModel<string>('manual', { default: '' })
const inputRef = ref<HTMLInputElement | null>(null)
let lineId = 0

function log(text: string, type: LogLine['type'] = 'info') {
  lines.value.unshift({
    id: ++lineId,
    type,
    text: `${new Date().toLocaleTimeString()} · ${text}`,
  })
}

const scanner = useQrScanner('reader', (code) => emit('scan', code))

function submitManual() {
  const code = manual.value.trim()
  if (code) {
    emit('scan', code)
    manual.value = ''
  }
  void nextTick(() => inputRef.value?.focus())
}

onMounted(async () => {
  log(props.introLog)
  inputRef.value?.focus()

  if (await scanner.start()) {
    log('Kamera aktif. Siap memindai.')
  } else {
    log(
      `Kamera tidak dapat diaktifkan: ${scanner.error.value}. Silakan gunakan input manual.`,
      'err',
    )
  }
})

defineExpose({ log })
</script>

<template>
  <div class="scanner-wrap">
    <div class="scanner-video"><div id="reader"></div></div>
    <div>
      <slot name="controls" />

      <div class="hint-box no-print" style="margin-bottom: 12px">
        <i class="fa-solid fa-mobile-screen-button"></i>
        <div v-html="hint"></div>
      </div>

      <div class="d-flex gap-2 mb-3">
        <input
          ref="inputRef"
          v-model="manual"
          type="text"
          class="form-control"
          placeholder="Ketik atau tembak QR di sini..."
          data-testid="input-manual-barcode"
          @keydown.enter.prevent="submitManual"
        />
        <button
          class="btn btn-amber"
          type="button"
          data-testid="btn-manual-scan"
          @click="submitManual"
        >
          <i class="fa-solid fa-check"></i>
        </button>
      </div>

      <div class="scanner-log" data-testid="scanner-log">
        <div v-for="line in lines" :key="line.id" class="line" :class="line.type">
          {{ line.text }}
        </div>
      </div>
    </div>
  </div>
</template>
