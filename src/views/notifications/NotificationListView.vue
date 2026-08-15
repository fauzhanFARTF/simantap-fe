<script setup lang="ts">
/**
 * Kotak masuk & arsip notifikasi.
 *
 * Satu komponen melayani dua rute (/notifications dan /notifications/arsip);
 * yang membedakan hanya arah aksinya, jadi memecahnya jadi dua berkas hanya
 * akan menduplikasi daftar yang sama.
 */
import { computed, onMounted, toRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import { notificationApi } from '@/api'
import { confirmAction } from '@/composables/useConfirm'
import { runAction, useAsync } from '@/composables/useAsync'
import { useLiveFilter } from '@/composables/useLiveFilter'
import { useNotificationStore } from '@/stores/notifications'
import type { Notification, Paginated } from '@/types/models'
import { fmtDateTime } from '@/utils/format'

const route = useRoute()
const notifications = useNotificationStore()

const isArchive = computed(() => route.path.endsWith('/arsip'))

const { data, loading, run } = useAsync<
  Paginated<Notification> & { other_count: number; unread_count: number }
>(() => notificationApi.list(isArchive.value), {
  results: [], count: 0, page: 1, pages: 1, page_size: 0, other_count: 0, unread_count: 0,
})

const rows = computed(() => data.value.results)
const { query, filtered } = useLiveFilter(toRef(rows, 'value'), (item) =>
  [item.title, item.body ?? ''].join(' '),
)

async function refresh() {
  await run()
  await notifications.refresh()
}

watch(isArchive, refresh)

async function markRead(item: Notification) {
  if (await runAction(() => notificationApi.markRead(item.id))) await refresh()
}

async function markAllRead() {
  if (await runAction(() => notificationApi.markAllRead())) await refresh()
}

async function archive(item: Notification) {
  if (await runAction(() => notificationApi.archive(item.id))) await refresh()
}

async function unarchive(item: Notification) {
  if (await runAction(() => notificationApi.unarchive(item.id))) await refresh()
}

async function archiveAll() {
  if (!(await confirmAction('Pindahkan SEMUA notifikasi di kotak masuk ke arsip?'))) return
  if (await runAction(() => notificationApi.archiveAll())) await refresh()
}

onMounted(refresh)
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ isArchive ? 'Arsip Notifikasi' : 'Notifikasi' }}</h1>
      <p class="subtitle">
        {{
          isArchive
            ? 'Notifikasi yang sudah disingkirkan dari kotak masuk. Tetap tersimpan dan bisa dikembalikan.'
            : 'Riwayat notifikasi in-app. Yang sudah tidak perlu bisa dipindahkan ke arsip.'
        }}
      </p>
    </div>
    <div class="d-flex gap-2">
      <template v-if="!isArchive">
        <button class="btn btn-outline-navy" data-testid="btn-read-all" @click="markAllRead">
          <i class="fa-solid fa-check-double"></i> Tandai Semua Dibaca
        </button>
        <button
          v-if="rows.length"
          class="btn btn-outline-navy"
          data-testid="btn-archive-all"
          @click="archiveAll"
        >
          <i class="fa-solid fa-box-archive"></i> Arsipkan Semua
        </button>
      </template>
    </div>
  </div>

  <!-- Tab: kotak masuk vs arsip -->
  <div class="d-flex gap-2 mb-3" role="tablist" data-testid="notif-tabs">
    <RouterLink
      to="/notifications"
      class="btn btn-sm"
      :class="isArchive ? 'btn-outline-navy' : 'btn-primary'"
      data-testid="tab-inbox"
    >
      <i class="fa-regular fa-bell"></i> Kotak Masuk
      <span v-if="isArchive && data.other_count" class="badge bg-light text-dark ms-1">
        {{ data.other_count }}
      </span>
    </RouterLink>
    <RouterLink
      to="/notifications/arsip"
      class="btn btn-sm"
      :class="isArchive ? 'btn-primary' : 'btn-outline-navy'"
      data-testid="tab-archive"
    >
      <i class="fa-solid fa-box-archive"></i> Arsip
      <span v-if="!isArchive && data.other_count" class="badge bg-light text-dark ms-1">
        {{ data.other_count }}
      </span>
    </RouterLink>
  </div>

  <div class="card-sb">
    <div v-if="loading" class="text-center text-slate py-5">Memuat notifikasi…</div>

    <div v-else-if="!rows.length" class="text-center text-slate py-5">
      <i
        class="fa-regular"
        :class="isArchive ? 'fa-folder-open' : 'fa-bell-slash'"
        style="font-size: 36px"
      ></i>
      <div class="mt-2">
        {{ isArchive ? 'Belum ada notifikasi di arsip.' : 'Belum ada notifikasi.' }}
      </div>
    </div>

    <template v-else>
      <div class="row g-2 mb-3">
        <div class="col-md-8">
          <input
            v-model="query"
            type="search"
            class="form-control"
            placeholder="Cari judul atau isi notifikasi..."
            autocomplete="off"
            data-testid="search-input"
          />
        </div>
      </div>

      <div
        v-for="item in filtered"
        :key="item.id"
        class="d-flex gap-3 p-3 border-bottom"
        :class="{ 'bg-light': !item.is_read }"
        :data-testid="`notif-${item.id}`"
      >
        <div
          style="
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(245, 158, 11, 0.14);
            color: #b45309;
            display: grid;
            place-items: center;
            flex-shrink: 0;
          "
        >
          <i class="fa-solid" :class="isArchive ? 'fa-box-archive' : 'fa-bell'"></i>
        </div>

        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold">{{ item.title }}</div>
            <div class="text-slate small">{{ fmtDateTime(item.created_at) }}</div>
          </div>
          <div class="small text-slate mt-1" style="white-space: pre-line">{{ item.body }}</div>
          <div v-if="item.archived_at" class="text-slate small mt-1">
            <i class="fa-solid fa-box-archive me-1"></i>Diarsipkan
            {{ fmtDateTime(item.archived_at) }}
          </div>
          <RouterLink
            v-if="item.link"
            :to="item.link"
            class="btn btn-sm btn-outline-navy mt-2"
            @click="!item.is_read && markRead(item)"
          >
            Buka
          </RouterLink>
        </div>

        <div class="d-flex flex-column gap-1">
          <template v-if="!isArchive">
            <button
              v-if="!item.is_read"
              class="btn btn-sm btn-outline-navy"
              title="Tandai dibaca"
              @click="markRead(item)"
            >
              <i class="fa-regular fa-circle-check"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-navy"
              title="Pindahkan ke arsip"
              :data-testid="`btn-archive-notif-${item.id}`"
              @click="archive(item)"
            >
              <i class="fa-solid fa-box-archive"></i>
            </button>
          </template>
          <button
            v-else
            class="btn btn-sm btn-outline-navy"
            title="Kembalikan ke kotak masuk"
            :data-testid="`btn-unarchive-notif-${item.id}`"
            @click="unarchive(item)"
          >
            <i class="fa-solid fa-rotate-left"></i>
          </button>
        </div>
      </div>

      <div v-if="!filtered.length" class="text-center text-slate py-4">
        Tidak ada notifikasi yang cocok dengan pencarian.
      </div>
    </template>
  </div>
</template>
