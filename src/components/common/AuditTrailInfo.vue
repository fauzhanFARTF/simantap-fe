<script setup lang="ts">
/** Baris kecil "Dibuat / Diubah / Dipulihkan oleh …" di halaman detail & ubah. */
import { computed } from 'vue'

import type { AuditTrail } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

/** Waktunya opsional: tidak semua entitas mengirim created_at/updated_at. */
type AuditRecord = AuditTrail & { created_at?: string; updated_at?: string }

const props = defineProps<{ record: AuditRecord | null | undefined }>()

const parts = computed(() => {
  const record = props.record
  if (!record) return []
  const items: string[] = []
  if (record.created_by_name)
    items.push(`Dibuat: ${record.created_by_name} · ${fmtDateTime(record.created_at)}`)
  if (record.updated_by_name)
    items.push(`Diubah: ${record.updated_by_name} · ${fmtDateTime(record.updated_at)}`)
  if (record.restored_by_name) items.push(`Dipulihkan: ${record.restored_by_name}`)
  return items
})
</script>

<template>
  <div v-if="parts.length" class="text-slate small mt-2" data-testid="audit-trail-info">
    {{ parts.join(' · ') }}
  </div>
</template>
