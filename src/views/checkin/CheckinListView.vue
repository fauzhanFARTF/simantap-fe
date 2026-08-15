<script setup lang="ts">
/** Daftar peminjaman yang menunggu pengembalian. */
import { computed, onMounted } from 'vue'

import { checkinApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import LoanQueueTable from '@/components/loans/LoanQueueTable.vue'
import { useAsync } from '@/composables/useAsync'
import type { Loan } from '@/types/models'

const { data, loading, run } = useAsync(() => checkinApi.list(), { results: [] as Loan[] })
const loans = computed(() => data.value.results)

onMounted(run)
</script>

<template>
  <PageHeader
    title="Pengembalian Alat"
    subtitle="Terima alat yang dikembalikan & lakukan pengecekan fisik."
  />
  <LoanQueueTable
    :loans="loans"
    :loading="loading"
    scan-base="checkin"
    testid="checkin-list"
    scan-testid-prefix="btn-scan-in-"
    empty-text="Tidak ada peminjaman yang menunggu pengembalian."
  />
</template>
