<script setup lang="ts">
/** Keadaan kosong: ikon bulat, judul, penjelasan, dan satu ajakan bertindak. */
withDefaults(
  defineProps<{ icon?: string; title: string; message?: string }>(),
  { icon: 'fa-inbox', message: '' },
)
</script>

<template>
  <div class="empty-state" data-testid="empty-state">
    <div class="empty-icon"><i :class="`fa-solid ${icon}`"></i></div>
    <h4>{{ title }}</h4>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
