/**
 * Klien HTTP tunggal untuk seluruh aplikasi.
 *
 * Tiga hal yang dipusatkan di sini supaya tidak diulang di setiap pemanggil:
 * penyisipan token, penyegaran token yang kedaluwarsa, dan penerjemahan error
 * menjadi satu pesan siap-tampil.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

const ACCESS_KEY = 'simantap.access'
const REFRESH_KEY = 'simantap.refresh'

export const tokenStorage = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Error yang sudah diterjemahkan ke pesan berbahasa Indonesia untuk pengguna. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Dipasang oleh store auth; dipanggil saat sesi benar-benar tidak bisa dipulihkan. */
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

// Satu penyegaran dipakai bersama semua permintaan yang gagal berbarengan —
// tanpa ini, sepuluh request paralel memicu sepuluh refresh dan sembilan token
// langsung terbuang (rotasi refresh token membatalkan yang lama).
let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.refresh
  if (!refresh) throw new ApiError('Sesi Anda telah berakhir.', 401)

  refreshing ??= axios
    .post(`${http.defaults.baseURL}/auth/refresh/`, { refresh })
    .then((response) => {
      const { access, refresh: rotated } = response.data
      tokenStorage.set(access, rotated)
      return access as string
    })
    .finally(() => {
      refreshing = null
    })

  return refreshing
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string; errors?: Record<string, string[]> }>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status ?? 0

    // 401 sekali → coba segarkan token lalu ulangi. Permintaan ke endpoint auth
    // dikecualikan supaya kegagalan login tidak berputar-putar.
    const isAuthCall = original?.url?.includes('/auth/')
    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      try {
        const access = await refreshAccessToken()
        original.headers = { ...original.headers, Authorization: `Bearer ${access}` }
        return http.request(original)
      } catch {
        tokenStorage.clear()
        onSessionExpired?.()
      }
    }

    const payload = error.response?.data
    const message =
      payload?.detail ||
      (status === 0
        ? 'Tidak dapat menghubungi server. Periksa koneksi Anda.'
        : 'Terjadi kesalahan pada server.')
    return Promise.reject(new ApiError(message, status, payload?.errors))
  },
)

/** Bungkus nilai form (termasuk berkas) jadi FormData untuk endpoint upload. */
export function toFormData(payload: Record<string, unknown>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    if (value instanceof File || value instanceof Blob) data.append(key, value)
    else if (Array.isArray(value)) value.forEach((item) => data.append(key, String(item)))
    else if (typeof value === 'boolean') data.append(key, value ? 'true' : 'false')
    else data.append(key, String(value))
  }
  return data
}
