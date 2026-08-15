<script setup lang="ts">
/** Profil Saya: informasi akun, foto profil, password, dan sambungan Telegram. */
import { computed, onMounted, reactive, ref } from 'vue'

import { meApi } from '@/api'
import PageHeader from '@/components/common/PageHeader.vue'
import { runAction } from '@/composables/useAsync'
import { usePhotoCapture } from '@/composables/usePhotoCapture'
import { useAuthStore } from '@/stores/auth'
import { photoUrl } from '@/utils/format'

const auth = useAuthStore()

const telegramEnabled = ref(false)
const botUsername = ref('')
const removePhoto = ref(false)
const savingPhoto = ref(false)
const savingPassword = ref(false)

/** Pratinjau kosong sampai ada foto — sesuai aplikasi lama. */
const capture = usePhotoCapture('')
const passwordForm = reactive({ old_password: '', new_password: '' })
const telegramChatId = ref('')
const savedChatId = ref('')

const hasPhoto = computed(() => Boolean(auth.user?.photo_url))
const isConnected = computed(() => savedChatId.value !== '')

async function savePhoto() {
  savingPhoto.value = true
  await runAction(
    () =>
      meApi.updatePhoto({
        photo: capture.file.value ?? undefined,
        photo_camera: capture.cameraDataUrl.value || undefined,
        remove_photo: removePhoto.value || undefined,
      }),
    {
      onSuccess: (result) => {
        auth.user = result.user
        capture.reset()
        removePhoto.value = false
      },
    },
  )
  savingPhoto.value = false
}

async function changePassword() {
  savingPassword.value = true
  const ok = await runAction(() =>
    meApi.changePassword(passwordForm.old_password, passwordForm.new_password),
  )
  savingPassword.value = false
  if (ok) Object.assign(passwordForm, { old_password: '', new_password: '' })
}

async function saveTelegram() {
  const ok = await runAction(() => meApi.saveTelegram(telegramChatId.value.trim()))
  if (ok) savedChatId.value = telegramChatId.value.trim()
}

const testTelegram = () => runAction(() => meApi.testTelegram())

onMounted(async () => {
  const profile = await meApi.profile()
  auth.user = profile.user
  telegramEnabled.value = profile.telegram_enabled
  botUsername.value = profile.telegram_bot_username.replace(/^@/, '')
  telegramChatId.value = profile.user.telegram_chat_id ?? ''
  savedChatId.value = telegramChatId.value
  if (profile.user.photo_url) capture.preview.value = profile.user.photo_url
})
</script>

<template>
  <PageHeader title="Profil Saya" subtitle="Kelola foto profil dan password Anda di sini." />

  <div class="row g-3">
    <div class="col-md-5">
      <div class="card-sb">
        <div class="card-title">Informasi Akun</div>
        <div class="d-flex align-items-center gap-3 mb-3">
          <img
            :src="photoUrl(auth.user?.photo_url)"
            alt="Foto profil"
            style="
              width: 72px;
              height: 72px;
              object-fit: cover;
              border-radius: 50%;
              border: 1px solid var(--sb-line);
              background: #fff;
            "
          />
          <div class="min-w-0">
            <div class="fw-semibold" style="word-break: break-word">{{ auth.user?.name }}</div>
            <div class="text-slate small">{{ auth.user?.role_label }}</div>
          </div>
        </div>
        <table class="table table-sm mb-0" style="table-layout: fixed; width: 100%">
          <tbody>
            <tr>
              <td class="text-slate" style="width: 38%">Email</td>
              <td style="word-break: break-word; overflow-wrap: anywhere">
                {{ auth.user?.email }}
              </td>
            </tr>
            <tr>
              <td class="text-slate">Unit Kerja</td>
              <td style="word-break: break-word; overflow-wrap: anywhere">
                {{ auth.user?.unit_kerja || '—' }}
              </td>
            </tr>
            <tr>
              <td class="text-slate">Telepon</td>
              <td style="word-break: break-word; overflow-wrap: anywhere">
                {{ auth.user?.phone || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-sb mt-3">
        <div class="card-title">Foto Profil</div>
        <form data-testid="profile-photo-form" @submit.prevent="savePhoto">
          <div class="d-flex align-items-start gap-3 flex-wrap">
            <div v-if="capture.preview.value">
              <img
                :src="capture.preview.value"
                alt="Pratinjau foto"
                style="
                  width: 120px;
                  height: 120px;
                  object-fit: cover;
                  border-radius: 12px;
                  border: 1px solid var(--sb-line);
                "
              />
            </div>
            <div class="flex-grow-1" style="min-width: 220px">
              <div class="d-flex gap-2 flex-wrap">
                <input
                  type="file"
                  class="form-control"
                  accept="image/jpeg,image/png,image/webp"
                  style="max-width: 260px"
                  data-testid="input-photo"
                  @change="capture.selectFile"
                />
                <button
                  type="button"
                  class="btn btn-outline-navy"
                  data-testid="btn-open-camera"
                  @click="capture.openCamera()"
                >
                  <i class="fa-solid fa-camera"></i> Ambil dari Kamera
                </button>
              </div>
              <div class="form-text">JPG, PNG, atau WEBP. Maksimal 3MB.</div>

              <div v-if="hasPhoto" class="form-check mt-2">
                <input
                  id="removePhotoCheck"
                  v-model="removePhoto"
                  class="form-check-input"
                  type="checkbox"
                  data-testid="input-remove-photo"
                />
                <label class="form-check-label" for="removePhotoCheck">Hapus foto saat ini</label>
              </div>

              <div
                v-show="capture.cameraOpen.value"
                class="mt-3 p-2 border rounded-3"
                data-testid="camera-panel"
              >
                <video
                  :ref="(el) => (capture.videoRef.value = el as HTMLVideoElement | null)"
                  autoplay
                  playsinline
                  muted
                  style="width: 100%; max-width: 320px; border-radius: 8px; background: #000"
                ></video>
                <div class="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    data-testid="btn-capture-photo"
                    @click="capture.capture()"
                  >
                    <i class="fa-solid fa-circle-dot"></i> Ambil Foto
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-navy btn-sm"
                    data-testid="btn-close-camera"
                    @click="capture.closeCamera()"
                  >
                    Batal
                  </button>
                </div>
              </div>
              <div v-if="capture.error.value" class="form-text text-danger">
                {{ capture.error.value }}
              </div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary" :disabled="savingPhoto" data-testid="btn-save-photo">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Foto
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="col-md-7">
      <div class="card-sb">
        <div class="card-title">Ganti Password</div>
        <form data-testid="profile-form" @submit.prevent="changePassword">
          <div class="mb-3">
            <label class="form-label" for="oldPassword">
              Password Lama <span class="req">*</span>
            </label>
            <input
              id="oldPassword"
              v-model="passwordForm.old_password"
              type="password"
              class="form-control"
              required
              autocomplete="current-password"
              data-testid="input-old-password"
            />
          </div>
          <div class="mb-3">
            <label class="form-label" for="newPassword">
              Password Baru <span class="req">*</span>
            </label>
            <input
              id="newPassword"
              v-model="passwordForm.new_password"
              type="password"
              class="form-control"
              required
              minlength="6"
              autocomplete="new-password"
              data-testid="input-new-password"
            />
          </div>
          <button class="btn btn-primary" :disabled="savingPassword" data-testid="btn-save-profile">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
        </form>
      </div>

      <div v-if="telegramEnabled" class="card-sb mt-3" data-testid="telegram-card">
        <div class="card-title">
          <i class="fa-brands fa-telegram me-2" style="color: #229ed9"></i>Notifikasi Telegram
        </div>

        <template v-if="isConnected">
          <p class="mb-2">
            <span class="badge bg-success"><i class="fa-solid fa-check"></i> Tersambung</span>
            <span class="text-slate small ms-1">
              Chat ID: <span class="text-mono">{{ savedChatId }}</span>
            </span>
          </p>
          <p class="text-slate small">
            Notifikasi SIMANTAP juga dikirim ke Telegram Anda. Kosongkan isian di bawah lalu simpan
            untuk memutus sambungan.
          </p>
        </template>

        <template v-else>
          <p class="text-slate small mb-2">
            Terima notifikasi langsung di Telegram. Cukup sekali atur:
          </p>
          <ol class="text-slate small ps-3 mb-3">
            <li>
              Buka Telegram, cari bot
              <a
                v-if="botUsername"
                :href="`https://t.me/${botUsername}`"
                target="_blank"
                rel="noopener"
              >
                <strong>@{{ botUsername }}</strong>
              </a>
              <strong v-else>bot SIMANTAP</strong>
              lalu tekan <strong>START</strong>. Tanpa langkah ini Telegram melarang bot mengirim
              pesan kepada Anda.
            </li>
            <li>
              Cari bot
              <a href="https://t.me/userinfobot" target="_blank" rel="noopener">
                <strong>@userinfobot</strong>
              </a>
              , tekan START — ia akan membalas <em>Id: 123456789</em>.
            </li>
            <li>Tempel angka Id itu di bawah, lalu Simpan dan Kirim Tes.</li>
          </ol>
        </template>

        <form class="mb-2" data-testid="telegram-form" @submit.prevent="saveTelegram">
          <label class="form-label" for="telegramChatId">Chat ID Telegram</label>
          <div class="input-group">
            <input
              id="telegramChatId"
              v-model="telegramChatId"
              type="text"
              class="form-control"
              placeholder="mis. 123456789"
              inputmode="numeric"
              data-testid="input-telegram-chat-id"
            />
            <button class="btn btn-primary" data-testid="btn-save-telegram">
              <i class="fa-solid fa-floppy-disk"></i> Simpan
            </button>
          </div>
          <div class="form-text">
            Angka saja. Kosongkan lalu Simpan untuk berhenti menerima notifikasi Telegram.
          </div>
        </form>

        <button
          v-if="isConnected"
          class="btn btn-outline-navy"
          data-testid="btn-test-telegram"
          @click="testTelegram"
        >
          <i class="fa-solid fa-paper-plane"></i> Kirim Tes
        </button>
      </div>
    </div>
  </div>
</template>
