<script setup lang="ts">
/** Daftar peminjaman disetujui yang siap diserahkan. */
import { computed, onMounted } from 'vue'

import { checkoutApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import LoanQueueTable from '@/components/loans/LoanQueueTable.vue'
import { useAsync } from '@/composables/useAsync'
import type { Loan } from '@/types/models'

const { data, loading, run } = useAsync(() => checkoutApi.list(), { results: [] as Loan[] })
const loans = computed(() => data.value.results)

onMounted(run)
</script>

<template>
  <PageHeader
    title="Penyerahan Alat"
    subtitle="Daftar peminjaman disetujui yang siap diserahkan ke pemohon."
  />
  <LoanQueueTable
    :loans="loans"
    :loading="loading"
    scan-base="checkout"
    testid="checkout-list"
    scan-testid-prefix="btn-scan-"
    empty-text="Tidak ada peminjaman yang menunggu penyerahan hari ini."
  />
</template>
