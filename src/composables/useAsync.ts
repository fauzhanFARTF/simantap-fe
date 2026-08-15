/**
 * Pola pemuatan data yang berulang di hampir setiap halaman: status memuat,
 * penampung data, dan pesan galat yang siap ditampilkan.
 *
 * Ditulis sekali di sini supaya tiap view tidak menyalin blok try/catch/finally
 * yang sama — dan supaya tidak ada halaman yang lupa mematikan spinner-nya.
 */

import { ref, shallowRef } from 'vue'

import { ApiError } from '@/api/client'
import { useUiStore } from '@/stores/ui'

export function useAsync<T>(loader: () => Promise<T>, initial: T) {
  const data = shallowRef<T>(initial)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run() {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
    } catch (exception) {
      error.value =
        exception instanceof ApiError ? exception.message : 'Terjadi kesalahan tak terduga.'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, run }
}

/**
 * Jalankan aksi yang mengubah data, tampilkan hasilnya sebagai pesan flash, dan
 * kembalikan true bila berhasil. Dipakai tombol-tombol aksi di seluruh aplikasi.
 */
export async function runAction<T>(
  action: () => Promise<T>,
  options: { onSuccess?: (result: T) => void; successMessage?: string } = {},
): Promise<boolean> {
  const ui = useUiStore()
  try {
    const result = await action()
    const message =
      options.successMessage ?? (result as { detail?: string } | undefined)?.detail
    if (message) ui.success(message)
    options.onSuccess?.(result)
    return true
  } catch (exception) {
    ui.error(exception instanceof ApiError ? exception.message : 'Terjadi kesalahan tak terduga.')
    return false
  }
}
