<script setup lang="ts">
/** Kartu daftar jadwal acara (mendatang maupun yang sudah lewat). */
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { Loan } from '@/types/models'
import { fmtDate, fmtTime } from '@/utils/format'

defineProps<{ icon: string; title: string; loans: Loan[]; emptyText: string }>()
</script>

<template>
  <div class="card-sb">
    <div class="card-title">
      <i :class="`fa-solid ${icon} me-2 text-slate`"></i>{{ title }}
    </div>

    <div v-if="!loans.length" class="text-slate small">{{ emptyText }}</div>

    <div
      v-for="loan in loans"
      :key="loan.uuid"
      class="d-flex align-items-start justify-content-between py-2 border-bottom gap-2"
    >
      <div class="min-w-0">
        <div class="small text-mono">
          <RouterLink :to="`/loans/${loan.uuid}`">{{ loan.loan_code }}</RouterLink>
        </div>
        <div class="fw-semibold small">{{ loan.event_name }}</div>
        <div v-if="loan.event_location" class="text-slate small">
          <i class="fa-solid fa-location-dot me-1"></i>{{ loan.event_location }}
        </div>
        <div class="text-slate small">
          <i class="fa-regular fa-calendar me-1"></i>
          {{ fmtDate(loan.start_date) }} — {{ fmtDate(loan.end_date) }}
        </div>
        <div v-if="loan.start_time" class="text-slate small">
          <i class="fa-regular fa-clock me-1"></i>{{ fmtTime(loan.start_time) }}
        </div>
        <div class="text-slate small">
          <i class="fa-solid fa-user me-1"></i>{{ loan.requester_name }}
          <span v-if="loan.participants.length" class="text-slate">
            · <i class="fa-solid fa-users me-1"></i>{{ loan.participants.join(', ') }}
          </span>
        </div>
      </div>
      <StatusBadge :status="loan.status" :label="loan.status_label" />
    </div>
  </div>
</template>
