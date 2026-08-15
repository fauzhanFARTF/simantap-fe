<script setup lang="ts">
/**
 * Tombol "Reset" merah di samping tombol tambah data.
 *
 * Hanya dirender untuk Super Admin, dan selalu meminta konfirmasi — aksinya
 * menghapus permanen dan tidak bisa dibatalkan.
 */
import { resetApi, type ResetScope } from '@/api'
import { confirmAction } from '@/composables/useConfirm'
import { runAction } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ scope: ResetScope; label: string; confirm: string }>()
const emit = defineEmits<{ done: [] }>()

const auth = useAuthStore()

async function run() {
  if (!(await confirmAction(props.confirm))) return
  if (await runAction(() => resetApi.run(props.scope))) emit('done')
}
</script>

<template>
  <button
    v-if="auth.isSuperadmin"
    type="button"
    class="btn btn-danger"
    :data-testid="`btn-reset-${scope}`"
    @click="run"
  >
    <i class="fa-solid fa-rotate"></i> {{ label }}
  </button>
</template>
