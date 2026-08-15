<script setup lang="ts">
/**
 * Kotak pencarian langsung di atas tabel.
 *
 * Menyaring di sisi klien — data tabel di aplikasi ini berjumlah ratusan, bukan
 * ribuan, sehingga penyaringan instan tanpa bolak-balik ke server terasa jauh
 * lebih ringan dipakai di lapangan.
 */
withDefaults(
  defineProps<{ placeholder?: string; resultCount?: number; totalCount?: number }>(),
  { placeholder: 'Cari…', resultCount: undefined, totalCount: undefined },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="d-flex align-items-center gap-2 flex-wrap mb-3">
    <div class="input-group" style="max-width: 380px">
      <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
      <input
        v-model="model"
        type="search"
        class="form-control"
        :placeholder="placeholder"
        data-testid="live-search"
      />
    </div>
    <div v-if="model && resultCount !== undefined" class="text-slate small" data-testid="search-count">
      {{ resultCount }} dari {{ totalCount }} data
    </div>
    <slot />
  </div>
</template>
