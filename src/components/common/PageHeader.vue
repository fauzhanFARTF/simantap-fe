<script setup lang="ts">
/** Judul halaman + subjudul, dengan ruang aksi di kanan. */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="d-flex gap-2 flex-wrap"><slot name="actions" /></div>
  </div>
</template>
