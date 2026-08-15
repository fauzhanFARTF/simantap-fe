<script setup lang="ts">
/** Pemilih foto: pratinjau + tombol unggah / kamera / reset. */
import type { usePhotoCapture } from '@/composables/usePhotoCapture'

const props = defineProps<{
  capture: ReturnType<typeof usePhotoCapture>
  hint?: string
  testidPrefix?: string
}>()

const prefix = props.testidPrefix ?? 'photo'

/** Elemen <video> diserahkan ke composable; ia yang memasang aliran kamera. */
function bindVideo(element: unknown) {
  props.capture.videoRef.value = (element ?? null) as HTMLVideoElement | null
}
</script>

<template>
  <div class="d-flex align-items-center gap-3">
    <img
      :src="capture.preview.value"
      alt="Pratinjau foto"
      style="
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid var(--sb-line);
        background: #fff;
        flex-shrink: 0;
      "
      :data-testid="`${prefix}-preview`"
    />
    <div class="flex-grow-1 min-w-0">
      <div class="d-flex gap-2 flex-wrap">
        <label class="btn btn-sm btn-outline-navy mb-0">
          <i class="fa-solid fa-upload"></i> Upload Foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            :data-testid="`${prefix}-file`"
            @change="capture.selectFile"
          />
        </label>
        <button
          type="button"
          class="btn btn-sm btn-outline-navy"
          :data-testid="`${prefix}-camera`"
          @click="capture.openCamera()"
        >
          <i class="fa-solid fa-camera"></i> Ambil dari Kamera
        </button>
        <button
          v-if="capture.changed.value"
          type="button"
          class="btn btn-sm btn-outline-navy"
          :data-testid="`${prefix}-reset`"
          @click="capture.reset()"
        >
          <i class="fa-solid fa-rotate-left"></i> Reset
        </button>
      </div>
      <div v-if="hint" class="form-text mb-0">{{ hint }}</div>
    </div>
  </div>

  <div v-show="capture.cameraOpen.value" class="mt-2 border rounded-3 p-2">
    <video
      :ref="bindVideo"
      autoplay
      playsinline
      muted
      style="width: 100%; max-height: 260px; border-radius: 8px; background: #000"
    ></video>
    <div class="d-flex gap-2 mt-2">
      <button
        type="button"
        class="btn btn-sm btn-primary"
        :data-testid="`${prefix}-capture`"
        @click="capture.capture()"
      >
        <i class="fa-solid fa-camera"></i> Jepret
      </button>
      <button type="button" class="btn btn-sm btn-outline-navy" @click="capture.closeCamera()">
        Tutup
      </button>
    </div>
  </div>

  <div v-if="capture.error.value" class="form-text text-danger">{{ capture.error.value }}</div>
</template>
