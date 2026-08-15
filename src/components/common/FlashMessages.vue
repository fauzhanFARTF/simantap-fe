<script setup lang="ts">
/** Pesan sukses / galat. Memudar sendiri setelah 4 detik, seperti aplikasi lama. */
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div
    v-for="item in ui.flashes"
    :key="item.id"
    class="alert autoclose"
    :class="item.type === 'success' ? 'alert-success' : 'alert-danger'"
    :data-testid="`flash-${item.type}`"
    @click="ui.dismiss(item.id)"
  >
    <i
      class="me-2"
      :class="item.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"
    ></i>
    {{ item.message }}
  </div>
</template>
