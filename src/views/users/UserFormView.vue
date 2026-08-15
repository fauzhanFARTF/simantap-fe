<script setup lang="ts">
/**
 * Tambah / ubah user.
 *
 * Daftar role yang boleh diberikan datang dari server (`form-options`) — bukan
 * daftar tetap di klien — supaya Administrator Pembantu tidak pernah melihat
 * pilihan role yang akan ditolak backend.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { userApi } from '@/api'
import AuditTrailInfo from '@/components/common/AuditTrailInfo.vue'
import { runAction } from '@/composables/useAsync'
import { usePhotoCapture } from '@/composables/usePhotoCapture'
import type { Option, Role, UserDetail } from '@/types/models'

const OTHER = '__other__'

const route = useRoute()
const router = useRouter()

const uuid = computed(() => route.params.uuid as string | undefined)
const isEdit = computed(() => Boolean(uuid.value))

const roles = ref<Option<Role>[]>([])
const unitOptions = ref<string[]>([])
const existing = ref<UserDetail | null>(null)
const submitting = ref(false)
const removePhoto = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const capture = usePhotoCapture('')

const form = reactive({
  name: '',
  email: '',
  role: '' as Role | '',
  phone: '',
  unit_kerja: '',
  unit_kerja_other: '',
  password: '',
  password_confirmation: '',
  extra_roles: [] as Role[],
})

const hasPhoto = computed(() => Boolean(existing.value?.photo_url))

async function submit() {
  submitting.value = true
  const unit = form.unit_kerja === OTHER ? form.unit_kerja_other : form.unit_kerja
  const payload: Record<string, unknown> = {
    name: form.name,
    email: form.email,
    role: form.role,
    phone: form.phone,
    unit_kerja: unit,
    // Role utama disaring server, tapi ikut dibuang di sini supaya tidak
    // terkirim sebagai peran tambahan yang mubazir.
    extra_roles: form.extra_roles.filter((role) => role !== form.role),
  }
  if (form.password) {
    payload.password = form.password
    payload.password_confirmation = form.password_confirmation
  }
  if (capture.file.value) payload.photo = capture.file.value
  if (isEdit.value && removePhoto.value) payload.remove_photo = true

  const ok = await runAction(
    () => (isEdit.value ? userApi.update(uuid.value!, payload) : userApi.create(payload)),
    { successMessage: isEdit.value ? 'User diperbarui.' : 'User dibuat.' },
  )
  submitting.value = false
  if (ok) await router.push('/users')
}

onMounted(async () => {
  const options = await userApi.formOptions()
  roles.value = options.roles
  unitOptions.value = options.unit_kerja

  if (!uuid.value) return
  const user = await userApi.detail(uuid.value)
  existing.value = user
  form.name = user.name
  form.email = user.email
  form.role = user.role
  form.phone = user.phone ?? ''
  form.extra_roles = user.extra_roles.map((role) => role.value)
  // Unit kerja bebas ketik bila tidak ada di daftar baku.
  if (user.unit_kerja && !options.unit_kerja.includes(user.unit_kerja)) {
    form.unit_kerja = OTHER
    form.unit_kerja_other = user.unit_kerja
  } else {
    form.unit_kerja = user.unit_kerja ?? ''
  }
  if (user.photo_url) capture.preview.value = user.photo_url
})
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ isEdit ? 'Ubah User' : 'Tambah User' }}</h1>
      <AuditTrailInfo v-if="isEdit" :record="existing" />
    </div>
    <RouterLink to="/users" class="btn btn-outline-navy">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </RouterLink>
  </div>

  <form data-testid="user-form" @submit.prevent="submit">
    <div class="card-sb">
      <div class="row g-3">
        <div class="col-md-12">
          <label class="form-label">Foto User</label>
          <div class="d-flex align-items-start gap-3 flex-wrap">
            <div v-if="capture.preview.value">
              <img
                :src="capture.preview.value"
                alt="Foto user"
                style="
                  width: 140px;
                  height: 140px;
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
                  style="max-width: 280px"
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

              <div v-if="isEdit && hasPhoto" class="form-check mt-2">
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
        </div>

        <div class="col-md-6">
          <label class="form-label" for="userName">Nama Lengkap <span class="req">*</span></label>
          <input
            id="userName"
            v-model="form.name"
            type="text"
            required
            class="form-control"
            data-testid="input-name"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label" for="userEmail">Email <span class="req">*</span></label>
          <input
            id="userEmail"
            v-model="form.email"
            type="email"
            required
            class="form-control"
            data-testid="input-email"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label" for="primaryRole">Role Utama <span class="req">*</span></label>
          <select
            id="primaryRole"
            v-model="form.role"
            class="form-select"
            required
            data-testid="input-role"
          >
            <option value="">— Pilih —</option>
            <option v-for="role in roles" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
        </div>

        <div class="col-md-8">
          <label class="form-label">Peran Tambahan</label>
          <div class="d-flex flex-wrap gap-3 border rounded-3 p-2" data-testid="extra-roles-box">
            <div v-for="role in roles" :key="role.value" class="form-check">
              <input
                :id="`extra_${role.value}`"
                v-model="form.extra_roles"
                class="form-check-input"
                type="checkbox"
                :value="role.value"
                :data-testid="`extra-role-${role.value}`"
              />
              <label class="form-check-label" :for="`extra_${role.value}`">{{ role.label }}</label>
            </div>
          </div>
          <div class="form-text">
            Centang bila user menjalankan lebih dari satu peran (mis. IT Staff + Staff Approval).
            Role utama otomatis diabaikan di sini.
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="userPhone">Telepon</label>
          <input id="userPhone" v-model="form.phone" type="text" class="form-control" />
        </div>

        <div class="col-md-4">
          <label class="form-label" for="unitKerjaSelect">Unit Kerja</label>
          <select
            id="unitKerjaSelect"
            v-model="form.unit_kerja"
            class="form-select"
            data-testid="input-unit-kerja"
          >
            <option value="">— Pilih —</option>
            <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
            <option :value="OTHER">Lainnya…</option>
          </select>
          <input
            v-if="form.unit_kerja === OTHER"
            v-model="form.unit_kerja_other"
            type="text"
            class="form-control mt-2"
            placeholder="Tulis unit kerja"
            data-testid="input-unit-kerja-other"
          />
        </div>

        <div class="col-md-6">
          <label class="form-label" for="userPassword">
            Password {{ isEdit ? '(kosongkan jika tidak diubah)' : '' }}
            <span v-if="!isEdit" class="req">*</span>
          </label>
          <div class="input-group">
            <input
              id="userPassword"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              :required="!isEdit"
              autocomplete="new-password"
              data-testid="input-password"
            />
            <button
              type="button"
              class="input-group-text"
              style="cursor: pointer"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>

        <div class="col-md-6">
          <label class="form-label" for="userPasswordConfirm">
            Konfirmasi Password <span v-if="!isEdit" class="req">*</span>
          </label>
          <div class="input-group">
            <input
              id="userPasswordConfirm"
              v-model="form.password_confirmation"
              :type="showConfirm ? 'text' : 'password'"
              class="form-control"
              :required="!isEdit"
              autocomplete="new-password"
              data-testid="input-password-confirm"
            />
            <button
              type="button"
              class="input-group-text"
              style="cursor: pointer"
              :aria-label="showConfirm ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showConfirm = !showConfirm"
            >
              <i :class="showConfirm ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="text-end mt-3">
      <button class="btn btn-primary" :disabled="submitting" data-testid="btn-save-user">
        <i class="fa-solid fa-floppy-disk"></i> Simpan
      </button>
    </div>
  </form>
</template>
