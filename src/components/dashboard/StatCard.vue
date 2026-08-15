<script setup lang="ts">
/** Kartu angka ringkasan di dashboard. */
withDefaults(
  defineProps<{
    tone?: 'navy' | 'success' | 'info' | 'danger'
    icon: string
    label: string
    value: number
    hint?: string
    testid?: string
  }>(),
  { tone: 'navy', hint: '', testid: undefined },
)
</script>

<template>
  <div class="stat-card hover-lift" :class="`tone-${tone}`">
    <div class="stat-icon"><i :class="`fa-solid ${icon}`"></i></div>
    <div class="label">{{ label }}</div>
    <div class="value" :data-testid="testid">{{ value }}</div>
    <div v-if="hint" class="text-slate small">{{ hint }}</div>
    <slot />
  </div>
</template>
