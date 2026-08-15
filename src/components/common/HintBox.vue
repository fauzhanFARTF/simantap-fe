<script setup lang="ts">
/** Kotak penjelasan singkat di atas halaman — membantu pengguna awam. */
withDefaults(defineProps<{ icon?: string }>(), { icon: 'fa-circle-info' })
</script>

<template>
  <div class="hint-box" data-testid="hint-box">
    <i :class="`fa-solid ${icon}`"></i>
    <div><slot /></div>
  </div>
</template>
