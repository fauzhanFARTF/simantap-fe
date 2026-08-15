/**
 * Konfirmasi berbasis Promise: `if (await confirmAction('Hapus X?')) { … }`.
 *
 * Keadaannya sengaja modul-global (satu dialog untuk seluruh aplikasi) supaya
 * tiap halaman cukup memanggil fungsinya tanpa menaruh komponen dialog sendiri.
 */

import { reactive } from 'vue'

export const confirmState = reactive({ open: false, message: '' })

let resolver: ((value: boolean) => void) | null = null

export function confirmAction(message: string): Promise<boolean> {
  confirmState.message = message
  confirmState.open = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function resolveConfirm(value: boolean) {
  confirmState.open = false
  resolver?.(value)
  resolver = null
}
