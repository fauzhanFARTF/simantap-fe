<script setup lang="ts">
/**
 * Pendaftaran mandiri setelah akun Google dikenali.
 *
 * `code` Google dititipkan halaman callback lewat sessionStorage dan baru
 * ditukar di server saat form dikirim — jadi identitas pendaftar selalu berasal
 * dari Google, bukan dari isian yang bisa diubah di peramban.
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { authApi } from '@/api'
import { ApiError } from '@/api/client'
import logo from '@/assets/img/logo-kominfo-icon.png'
import PhotoPicker from '@/components/common/PhotoPicker.vue'
import { usePhotoCapture } from '@/composables/usePhotoCapture'
import AuthLayout from '@/layouts/AuthLayout.vue'
import type { GoogleProfile } from '@/api'

const GOOGLE_CODE_KEY = 'simantap.google_code'
const GOOGLE_PROFILE_KEY = 'simantap.google_profile'

const UNIT_KERJA_OPTIONS = [
  'Bidang Pengelolaan Aplikasi Informatika',
  'Bidang Informasi dan Komunikasi Publik (IKP)',
  'Bidang Statistik Sektoral',
  'Bidang Penyelenggaraan Persandian untuk Keamanan Informasi',
  'Sekretariat',
]

const REGISTER_ROLES = [
  { value: 'inventory_staff', label: 'IT Staff' },
  { value: 'pemohon', label: 'Personel Luar' },
]

const router = useRouter()

const profile = ref<GoogleProfile | null>(null)
const form = ref({ name: '', role: '', phone: '', unit_kerja: '', unit_kerja_other: '' })
const submitting = ref(false)
const error = ref('')

const capture = usePhotoCapture(logo)

onMounted(() => {
  const stored = sessionStorage.getItem(GOOGLE_PROFILE_KEY)
  if (!stored || !sessionStorage.getItem(GOOGLE_CODE_KEY)) {
    void router.replace('/login')
    return
  }
  profile.value = JSON.parse(stored) as GoogleProfile
  form.value.name = profile.value.name
  if (profile.value.picture) capture.preview.value = profile.value.picture
})

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const unit =
      form.value.unit_kerja === '__other__' ? form.value.unit_kerja_other : form.value.unit_kerja

    await authApi.googleRegister({
      code: sessionStorage.getItem(GOOGLE_CODE_KEY) ?? '',
      name: form.value.name,
      role: form.value.role,
      phone: form.value.phone,
      unit_kerja: unit,
      photo: capture.file.value ?? undefined,
      photo_camera: capture.cameraDataUrl.value,
    })
    sessionStorage.removeItem(GOOGLE_CODE_KEY)
    sessionStorage.removeItem(GOOGLE_PROFILE_KEY)
    await router.replace('/daftar/menunggu')
  } catch (exception) {
    error.value =
      exception instanceof ApiError ? exception.message : 'Pendaftaran gagal disimpan.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card card-sb" data-testid="register-card" style="max-width: 520px">
      <div class="brand-mark"><img :src="logo" alt="Logo Kominfo" /></div>
      <h1>Lengkapi Pendaftaran</h1>
      <p class="sub">
        Akun Google Anda dikenali. Lengkapi data berikut, lalu Administrator akan meninjau
        pendaftaran Anda.
      </p>

      <div v-if="error" class="alert alert-danger" data-testid="register-error">{{ error }}</div>

      <div
        v-if="profile"
        class="d-flex align-items-center gap-3 p-2 mb-3 border rounded-3"
        data-testid="google-identity"
      >
        <img
          v-if="profile.picture"
          :src="profile.picture"
          alt="Foto akun Google"
          style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover"
        />
        <div class="min-w-0 text-start">
          <div class="fw-semibold">{{ profile.name }}</div>
          <div class="text-slate small">{{ profile.email }}</div>
        </div>
      </div>

      <form class="text-start" data-testid="register-form" @submit.prevent="submit">
        <div class="mb-3">
          <label class="form-label">Foto Profil</label>
          <PhotoPicker
            :capture="capture"
            testid-prefix="register-photo"
            hint="JPG/PNG/WEBP, maksimal 10MB. Bila dikosongkan, foto akun Google yang dipakai."
          />
        </div>

        <div class="mb-3">
          <label class="form-label" for="regName">Nama Lengkap <span class="req">*</span></label>
          <input
            id="regName"
            v-model="form.name"
            type="text"
            required
            class="form-control"
            data-testid="register-name"
          />
        </div>

        <div class="mb-3">
          <label class="form-label" for="regEmail">Email</label>
          <input id="regEmail" type="email" class="form-control" :value="profile?.email" disabled />
          <div class="form-text">Diambil dari akun Google dan tidak bisa diubah.</div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="regRole">Mendaftar sebagai <span class="req">*</span></label>
          <select
            id="regRole"
            v-model="form.role"
            required
            class="form-select"
            data-testid="register-role"
          >
            <option value="">— Pilih —</option>
            <option v-for="role in REGISTER_ROLES" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
          <div class="form-text">
            <strong>IT Staff</strong> untuk petugas Diskominfo yang ikut menangani peralatan.
            <strong>Personel Luar</strong> untuk peminjam dari luar bidang.
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="regPhone">Telepon</label>
          <input
            id="regPhone"
            v-model="form.phone"
            type="text"
            class="form-control"
            placeholder="mis. 0812-3456-7890"
            data-testid="register-phone"
          />
        </div>

        <div class="mb-4">
          <label class="form-label" for="regUnit">Unit Kerja</label>
          <select
            id="regUnit"
            v-model="form.unit_kerja"
            class="form-select"
            data-testid="register-unit-kerja"
          >
            <option value="">— Pilih —</option>
            <option v-for="unit in UNIT_KERJA_OPTIONS" :key="unit" :value="unit">{{ unit }}</option>
            <option value="__other__">Lainnya…</option>
          </select>
          <input
            v-if="form.unit_kerja === '__other__'"
            v-model="form.unit_kerja_other"
            type="text"
            class="form-control mt-2"
            placeholder="Tulis unit kerja"
            required
            data-testid="register-unit-kerja-other"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-lg w-100"
          :disabled="submitting"
          data-testid="register-submit"
        >
          <i class="fa-solid fa-paper-plane"></i>
          {{ submitting ? 'Mengirim…' : 'Kirim Pendaftaran' }}
        </button>
      </form>

      <p class="text-center mt-3 mb-0">
        <RouterLink to="/login" class="small text-slate">
          Batal, kembali ke halaman masuk
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
