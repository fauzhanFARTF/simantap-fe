<script setup lang="ts">
/** Lencana status — warna & tulisannya sama dengan `status_badge()` lama. */
import { computed } from 'vue'

import { badgeClass, badgeLabel } from '@/utils/badges'

const props = defineProps<{ status: string; label?: string }>()

const cls = computed(() => badgeClass(props.status))
const text = computed(() => props.label ?? badgeLabel(props.status))
</script>

<template>
  <span :class="cls">{{ text }}</span>
</template>
