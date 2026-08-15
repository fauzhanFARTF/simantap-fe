/**
 * Penyaring tabel sisi klien.
 *
 * Setiap baris diubah menjadi satu string yang bisa dicari (`haystack`), lalu
 * kata kunci dipecah per-kata: mengetik "sony kamera" tetap menemukan baris
 * yang memuat keduanya walau urutannya berbeda di kolom yang berbeda.
 */

import { computed, ref, type Ref } from 'vue'

export function useLiveFilter<T>(rows: Ref<T[]>, haystack: (row: T) => string) {
  const query = ref('')

  const filtered = computed(() => {
    const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return rows.value
    return rows.value.filter((row) => {
      const text = haystack(row).toLowerCase()
      return terms.every((term) => text.includes(term))
    })
  })

  return { query, filtered }
}
