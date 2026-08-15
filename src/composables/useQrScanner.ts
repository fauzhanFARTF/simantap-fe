/**
 * Pemindai QR kamera (html5-qrcode).
 *
 * Hanya format QR yang diaktifkan — stiker alat semuanya QR, dan membiarkan
 * pemindai menebak format 1D membuatnya jauh lebih lambat mengunci gambar.
 *
 * Pustakanya diimpor dinamis supaya tidak ikut terbawa di bundel halaman lain:
 * hanya dua halaman di aplikasi ini yang memindai.
 */

import { onBeforeUnmount, ref } from 'vue'

/** Jeda anti-pantul: satu QR yang sama tidak diproses dua kali dalam 2 detik. */
const DEBOUNCE_MS = 2000

export function useQrScanner(elementId: string, onScan: (code: string) => void) {
  const active = ref(false)
  const error = ref('')

  let scanner: { start: Function; stop: () => Promise<void> } | null = null
  let lastCode = ''
  let lastAt = 0

  function handle(text: string) {
    const now = Date.now()
    if (text === lastCode && now - lastAt < DEBOUNCE_MS) return
    lastCode = text
    lastAt = now
    onScan(text)
  }

  async function start() {
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      }) as unknown as { start: Function; stop: () => Promise<void> }

      const config = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.333 }
      try {
        await scanner.start({ facingMode: 'environment' }, config, handle, () => {})
      } catch {
        // Sebagian perangkat menolak facingMode; jatuh ke kamera mana pun yang ada.
        const cameras = await Html5Qrcode.getCameras()
        if (!cameras?.length) throw new Error('Tidak ada kamera terdeteksi')
        await scanner.start(cameras[0]!.id, config, handle, () => {})
      }
      active.value = true
      return true
    } catch (exception) {
      error.value = exception instanceof Error ? exception.message : String(exception)
      active.value = false
      return false
    }
  }

  async function stop() {
    try {
      await scanner?.stop()
    } catch {
      // Kamera mungkin sudah dilepas peramban; tidak ada yang perlu diselamatkan.
    }
    active.value = false
  }

  onBeforeUnmount(stop)

  return { active, error, start, stop }
}
