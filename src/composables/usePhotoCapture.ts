/**
 * Pemilihan foto: unggah berkas ATAU jepret lewat kamera.
 *
 * Hasil jepretan dikirim sebagai data URL base64 di field terpisah, bukan
 * disuntikkan balik ke `<input type=file>` — cara itu bergantung pada dukungan
 * `DataTransfer` yang tidak merata di peramban seluler.
 */

import { onBeforeUnmount, ref } from 'vue'

const MAX_BYTES = 10 * 1024 * 1024
/** Jepretan diperkecil supaya base64-nya ringan, jauh di bawah batas 10MB. */
const MAX_DIMENSION = 640

export function usePhotoCapture(defaultPreview = '') {
  const preview = ref(defaultPreview)
  const file = ref<File | null>(null)
  const cameraDataUrl = ref('')
  const cameraOpen = ref(false)
  const error = ref('')
  const changed = ref(false)

  const videoRef = ref<HTMLVideoElement | null>(null)
  /** Kamera belakang secara default -- paling praktis untuk memotret alat/BMN. */
  const facingMode = ref<'user' | 'environment'>('environment')
  let stream: MediaStream | null = null

  async function startStream() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode.value },
      audio: false,
    })
    // Elemen <video> baru ada setelah panel dirender.
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (videoRef.value) videoRef.value.srcObject = stream
  }

  function selectFile(event: Event) {
    const input = event.target as HTMLInputElement
    const selected = input.files?.[0]
    if (!selected) return
    if (selected.size > MAX_BYTES) {
      error.value = 'Ukuran foto maksimal 10MB.'
      input.value = ''
      return
    }
    error.value = ''
    cameraDataUrl.value = ''
    file.value = selected
    changed.value = true

    const reader = new FileReader()
    reader.onload = (loaded) => (preview.value = String(loaded.target?.result ?? ''))
    reader.readAsDataURL(selected)
  }

  async function openCamera() {
    error.value = ''
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Kamera tidak didukung peramban ini. Silakan pakai Upload Foto.'
      return
    }
    try {
      cameraOpen.value = true
      await startStream()
    } catch {
      // Paling sering: izin ditolak, atau halaman bukan HTTPS — kamera memang
      // hanya diizinkan peramban pada origin aman.
      error.value =
        'Tidak bisa membuka kamera. Pastikan izin kamera diberikan dan situs diakses lewat ' +
        'HTTPS. Anda tetap bisa memakai Upload Foto.'
      closeCamera()
    }
  }

  /** Pindah kamera depan <-> belakang tanpa menutup panel. */
  async function switchCamera() {
    const previous = facingMode.value
    facingMode.value = previous === 'environment' ? 'user' : 'environment'
    stream?.getTracks().forEach((track) => track.stop())
    try {
      await startStream()
    } catch {
      // Perangkat cuma punya satu kamera, atau kamera lain tidak bisa diakses --
      // kembali ke yang sebelumnya daripada membiarkan panel gelap tanpa aliran video.
      facingMode.value = previous
      try {
        await startStream()
      } catch {
        error.value = 'Tidak bisa beralih kamera. Perangkat mungkin hanya punya satu kamera.'
        closeCamera()
      }
    }
  }

  function closeCamera() {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    if (videoRef.value) videoRef.value.srcObject = null
    cameraOpen.value = false
  }

  function capture() {
    const video = videoRef.value
    if (!video?.videoWidth) {
      error.value = 'Kamera belum siap, coba sesaat lagi.'
      return
    }
    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    cameraDataUrl.value = dataUrl
    preview.value = dataUrl
    file.value = null // jepretan kamera menang atas berkas
    changed.value = true
    error.value = ''
    closeCamera()
  }

  function reset() {
    file.value = null
    cameraDataUrl.value = ''
    preview.value = defaultPreview
    changed.value = false
    error.value = ''
    closeCamera()
  }

  onBeforeUnmount(closeCamera)

  return {
    preview,
    file,
    cameraDataUrl,
    cameraOpen,
    error,
    changed,
    videoRef,
    facingMode,
    selectFile,
    openCamera,
    closeCamera,
    switchCamera,
    capture,
    reset,
  }
}
