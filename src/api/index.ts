/**
 * Seluruh endpoint SIMANTAP dalam satu tempat.
 *
 * Komponen tidak pernah memanggil axios langsung — mereka memanggil fungsi di
 * sini, sehingga URL & bentuk payload hanya perlu diubah di satu berkas bila
 * kontrak API berubah.
 */

import { http, toFormData } from './client'
import type {
  AppConfig,
  Asset,
  AssetDetail,
  AssetSlim,
  BorrowedItem,
  Category,
  CurrentUser,
  DashboardPayload,
  Loan,
  LoanDetail,
  LoanItem,
  Notification,
  NotificationLogRow,
  OpdItemRow,
  Option,
  Package,
  Paginated,
  RegistrationRow,
  Repair,
  RepairDetail,
  Role,
  TrashEntity,
  TrashRow,
  UserDetail,
  UserListItem,
  UserSlim,
} from '@/types/models'

const unwrap = <T>(promise: Promise<{ data: T }>) => promise.then((response) => response.data)

// ─── Autentikasi ────────────────────────────────────────────────────────────
export interface LoginResponse {
  access: string
  refresh: string
  user: CurrentUser
}

export interface GoogleProfile {
  sub: string
  email: string
  name: string
  picture: string | null
}

export type GoogleCallbackResponse =
  | ({ action: 'login' } & LoginResponse)
  | { action: 'register'; profile: GoogleProfile }
  | { action: 'pending' }

export const authApi = {
  config: () => unwrap<AppConfig>(http.get('/auth/config/')),
  login: (email: string, password: string, turnstileToken?: string) =>
    unwrap<LoginResponse>(
      http.post('/auth/login/', { email, password, turnstile_token: turnstileToken }),
    ),
  logout: () => unwrap<void>(http.post('/auth/logout/')),
  googleStart: () => unwrap<{ auth_url: string; state: string }>(http.get('/auth/google/start/')),
  googleCallback: (code: string, state: string, expectedState: string) =>
    unwrap<GoogleCallbackResponse>(
      http.post('/auth/google/callback/', { code, state, expected_state: expectedState }),
    ),
  googleRegister: (payload: Record<string, unknown>) =>
    unwrap<{ action: string }>(
      http.post('/auth/google/register/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
}

// ─── Sesi & profil ──────────────────────────────────────────────────────────
export interface MePayload {
  user: CurrentUser
  unread_notifications: number
  pending_registrations: number
  roles: Role[]
  is_superadmin: boolean
}

export const meApi = {
  fetch: () => unwrap<MePayload>(http.get('/me/')),
  profile: () =>
    unwrap<{
      user: CurrentUser
      telegram_enabled: boolean
      telegram_bot_username: string
      unit_kerja_options: string[]
    }>(http.get('/profile/')),
  updatePhoto: (payload: { photo?: File; photo_camera?: string; remove_photo?: boolean }) =>
    unwrap<{ detail: string; user: CurrentUser }>(
      http.post('/profile/photo/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  changePassword: (oldPassword: string, newPassword: string) =>
    unwrap<{ detail: string }>(
      http.post('/profile/password/', { old_password: oldPassword, new_password: newPassword }),
    ),
  saveTelegram: (chatId: string) =>
    unwrap<{ detail: string }>(http.post('/profile/telegram/', { telegram_chat_id: chatId })),
  testTelegram: () => unwrap<{ detail: string }>(http.post('/profile/telegram/test/')),
}

// ─── Manajemen user ─────────────────────────────────────────────────────────
export const userApi = {
  list: () => unwrap<Paginated<UserListItem>>(http.get('/users/')),
  detail: (uuid: string) => unwrap<UserDetail>(http.get(`/users/${uuid}/`)),
  formOptions: () =>
    unwrap<{ roles: Option<Role>[]; unit_kerja: string[] }>(http.get('/users/form-options/')),
  create: (payload: Record<string, unknown>) =>
    unwrap<UserDetail>(
      http.post('/users/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  update: (uuid: string, payload: Record<string, unknown>) =>
    unwrap<UserDetail>(
      http.patch(`/users/${uuid}/`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  toggle: (uuid: string) => unwrap<UserListItem>(http.post(`/users/${uuid}/toggle/`)),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.delete(`/users/${uuid}/`)),
  itStaff: () => unwrap<{ results: UserSlim[] }>(http.get('/it-staff/')),
}

export const registrationApi = {
  list: () => unwrap<Paginated<RegistrationRow>>(http.get('/registrations/')),
  approve: (uuid: string) =>
    unwrap<{ detail: string }>(http.post(`/registrations/${uuid}/approve/`)),
  reject: (uuid: string) => unwrap<{ detail: string }>(http.post(`/registrations/${uuid}/reject/`)),
  pendingCount: () => unwrap<{ count: number }>(http.get('/registrations/pending-count/')),
}

// ─── Master data ────────────────────────────────────────────────────────────
export const categoryApi = {
  list: () => unwrap<Paginated<Category>>(http.get('/categories/')),
  detail: (uuid: string) => unwrap<Category>(http.get(`/categories/${uuid}/`)),
  create: (payload: Partial<Category>) => unwrap<Category>(http.post('/categories/', payload)),
  update: (uuid: string, payload: Partial<Category>) =>
    unwrap<Category>(http.patch(`/categories/${uuid}/`, payload)),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.delete(`/categories/${uuid}/`)),
}

export interface AssetQuery {
  q?: string
  status?: string
  category_id?: number | string
}

export const assetApi = {
  list: (params: AssetQuery = {}) =>
    unwrap<Paginated<Asset> & { pimpinan_only: boolean }>(http.get('/assets/', { params })),
  detail: (uuid: string) => unwrap<AssetDetail>(http.get(`/assets/${uuid}/`)),
  create: (payload: Record<string, unknown>) =>
    unwrap<AssetDetail>(
      http.post('/assets/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  update: (uuid: string, payload: Record<string, unknown>) =>
    unwrap<AssetDetail>(
      http.patch(`/assets/${uuid}/`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.delete(`/assets/${uuid}/`)),
  retire: (uuid: string) => unwrap<{ detail: string }>(http.post(`/assets/${uuid}/retire/`)),
  unretire: (uuid: string) => unwrap<{ detail: string }>(http.post(`/assets/${uuid}/unretire/`)),
  search: (params: { q?: string; category_id?: number | string } = {}) =>
    unwrap<{ results: AssetSlim[] }>(http.get('/assets/search/', { params })),
  nextCode: (categoryId: number) =>
    unwrap<{ asset_code: string; bmn_number: string }>(
      http.get('/assets/next-code/', { params: { category_id: categoryId } }),
    ),
  barcodeBatch: (uuids: string[]) =>
    unwrap<{ results: AssetSlim[] }>(
      http.get('/assets/barcode-batch/', { params: { uuids: uuids.join(',') } }),
    ),
  statuses: () => unwrap<{ results: Option[] }>(http.get('/asset-statuses/')),
}

export const packageApi = {
  list: () => unwrap<Paginated<Package>>(http.get('/packages/')),
  detail: (uuid: string) => unwrap<Package>(http.get(`/packages/${uuid}/`)),
  create: (payload: Record<string, unknown>) => unwrap<Package>(http.post('/packages/', payload)),
  update: (uuid: string, payload: Record<string, unknown>) =>
    unwrap<Package>(http.patch(`/packages/${uuid}/`, payload)),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.delete(`/packages/${uuid}/`)),
}

// ─── Peminjaman ─────────────────────────────────────────────────────────────
export interface LoanFormOptions {
  categories: Category[]
  assets: AssetSlim[]
  packages: Package[]
  it_staff: UserSlim[]
  /** asset_id → nama penanggung jawab yang sedang memegang alat itu. */
  holders: Record<string, string[]>
  /** asset_id → nama personel yang dilibatkan pada peminjaman berjalan. */
  followers: Record<string, string[]>
  is_personal_borrower: boolean
}

export interface LoanCreatePayload {
  loan_type: 'event' | 'opd'
  event_name: string
  event_location?: string
  start_date: string
  end_date?: string
  start_time?: string | null
  purpose?: string
  asset_ids: number[]
  package_ids?: number[]
  participant_ids?: number[]
  return_dates?: Record<string, string>
}

export const loanApi = {
  list: () => unwrap<Paginated<Loan>>(http.get('/loans/')),
  detail: (uuid: string) => unwrap<LoanDetail>(http.get(`/loans/${uuid}/`)),
  formOptions: () => unwrap<LoanFormOptions>(http.get('/loans/form-options/')),
  create: (payload: LoanCreatePayload) =>
    unwrap<LoanDetail & { detail: string }>(http.post('/loans/', payload)),
  cancel: (uuid: string) => unwrap<{ detail: string }>(http.post(`/loans/${uuid}/cancel/`)),
  removeItem: (uuid: string, itemId: number) =>
    unwrap<{ detail: string; loan_cancelled: boolean }>(
      http.post(`/loans/${uuid}/items/${itemId}/remove/`),
    ),
  editName: (uuid: string, eventName: string) =>
    unwrap<{ detail: string }>(http.post(`/loans/${uuid}/edit-name/`, { event_name: eventName })),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.delete(`/loans/${uuid}/`)),
  removeAll: () => unwrap<{ detail: string }>(http.post('/loans/delete-all/')),
  approve: (uuid: string, note = '') =>
    unwrap<{ detail: string }>(http.post(`/loans/${uuid}/approve/`, { note })),
  reject: (uuid: string, note = '') =>
    unwrap<{ detail: string }>(http.post(`/loans/${uuid}/reject/`, { note })),
  beritaAcara: (uuid: string) =>
    unwrap<{ document: 'berita_acara' | 'bast_opd'; loan: LoanDetail; requester_phone: string | null }>(
      http.get(`/loans/${uuid}/berita-acara/`),
    ),
  approvals: () =>
    unwrap<{ pending: Loan[]; decided: Loan[] }>(http.get('/approvals/')),
}

// ─── Penyerahan & pengembalian ──────────────────────────────────────────────
export interface ScanPageData {
  loan: LoanDetail
  items: LoanItem[]
  borrowed_items: BorrowedItem[]
}

export interface CheckoutScanResult {
  asset_name: string
  bmn: string
  at_opd: boolean
  message: string
}

export interface CheckinScanResult {
  stock: boolean
  habis?: boolean
  asset_name: string
  bmn: string
  condition: string
  repair_uuid?: string | null
  repair_code?: string | null
  purchase_price_fmt?: string
  current_value_fmt?: string
  message: string
}

export const checkoutApi = {
  list: () => unwrap<{ results: Loan[] }>(http.get('/checkout/')),
  detail: (uuid: string) => unwrap<ScanPageData>(http.get(`/checkout/${uuid}/`)),
  scan: (uuid: string, barcode: string) =>
    unwrap<CheckoutScanResult>(http.post(`/checkout/${uuid}/scan/`, { barcode })),
  finalize: (uuid: string) => unwrap<{ detail: string }>(http.post(`/checkout/${uuid}/finalize/`)),
}

export const checkinApi = {
  list: () => unwrap<{ results: Loan[] }>(http.get('/checkin/')),
  detail: (uuid: string) => unwrap<ScanPageData>(http.get(`/checkin/${uuid}/`)),
  scan: (
    uuid: string,
    payload: { barcode: string; condition?: string; damage_note?: string; sisa?: string },
  ) => unwrap<CheckinScanResult>(http.post(`/checkin/${uuid}/scan/`, payload)),
  finalize: (uuid: string) => unwrap<{ detail: string }>(http.post(`/checkin/${uuid}/finalize/`)),
}

// ─── Barang di OPD ──────────────────────────────────────────────────────────
export const opdApi = {
  list: () => unwrap<{ results: OpdItemRow[] }>(http.get('/opd-items/')),
  returnItem: (itemId: number, payload: { condition: string; note: string }) =>
    unwrap<{ detail: string }>(http.post(`/opd-items/${itemId}/return/`, payload)),
}

// ─── Koreksi data oleh Super Admin ──────────────────────────────────────────
export const superadminApi = {
  undoCheckout: (itemId: number) =>
    unwrap<{ detail: string }>(http.post(`/sa/checkout-item/${itemId}/undo/`)),
  undoCheckin: (itemId: number) =>
    unwrap<{ detail: string }>(http.post(`/sa/checkin-item/${itemId}/undo/`)),
  editOpdItem: (itemId: number, payload: { will_return: boolean; expected_return_date?: string }) =>
    unwrap<{ detail: string }>(http.post(`/sa/opd-item/${itemId}/edit/`, payload)),
  deleteOpdItem: (itemId: number) =>
    unwrap<{ detail: string }>(http.post(`/sa/opd-item/${itemId}/delete/`)),
  editRepair: (uuid: string, payload: { complaint: string; status: string }) =>
    unwrap<{ detail: string }>(http.post(`/repairs/${uuid}/sa-edit/`, payload)),
}

// ─── Perbaikan ──────────────────────────────────────────────────────────────
export const repairApi = {
  list: () => unwrap<{ active: Repair[]; done: Repair[] }>(http.get('/repairs/')),
  detail: (uuid: string) => unwrap<RepairDetail>(http.get(`/repairs/${uuid}/`)),
  printForm: (uuid: string) => unwrap<RepairDetail>(http.get(`/repairs/${uuid}/print/`)),
  complete: (uuid: string, payload: { technician_name: string; action_taken: string }) =>
    unwrap<{ detail: string }>(http.post(`/repairs/${uuid}/complete/`, payload)),
  remove: (uuid: string) => unwrap<{ detail: string }>(http.post(`/repairs/${uuid}/delete/`)),
  removeAll: () => unwrap<{ detail: string }>(http.post('/repairs/delete-all/')),
  statuses: () => unwrap<{ results: Option[] }>(http.get('/repair-statuses/')),
}

// ─── Notifikasi ─────────────────────────────────────────────────────────────
export const notificationApi = {
  list: (archived = false) =>
    unwrap<Paginated<Notification> & { other_count: number; unread_count: number }>(
      http.get('/notifications/', { params: { archived: archived ? 1 : 0 } }),
    ),
  markRead: (id: number) => unwrap<{ detail: string }>(http.post(`/notifications/${id}/read/`)),
  markAllRead: () => unwrap<{ detail: string }>(http.post('/notifications/read-all/')),
  archive: (id: number) => unwrap<{ detail: string }>(http.post(`/notifications/${id}/archive/`)),
  unarchive: (id: number) =>
    unwrap<{ detail: string }>(http.post(`/notifications/${id}/unarchive/`)),
  archiveAll: () => unwrap<{ detail: string }>(http.post('/notifications/archive-all/')),
  remove: (id: number) => unwrap<{ detail: string }>(http.post(`/notifications/${id}/delete/`)),
  removeAll: () => unwrap<{ detail: string }>(http.post('/notifications/delete-all/')),
  unreadCount: () => unwrap<{ count: number }>(http.get('/notifications/unread-count/')),
  log: () => unwrap<{ results: NotificationLogRow[] }>(http.get('/notification-log/')),
}

// ─── Dashboard, Riwayat Terhapus, Reset ─────────────────────────────────────
export const dashboardApi = {
  fetch: () => unwrap<DashboardPayload>(http.get('/dashboard/')),
}

export const trashApi = {
  list: () => unwrap<{ deleted: TrashRow[]; restored: TrashRow[] }>(http.get('/trash/')),
  restore: (type: TrashEntity, id: number) =>
    unwrap<{ detail: string }>(http.post(`/trash/${type}/${id}/restore/`)),
  purge: (type: TrashEntity, id: number) =>
    unwrap<{ detail: string }>(http.post(`/trash/${type}/${id}/purge/`)),
}

export type ResetScope = 'loans' | 'users' | 'assets' | 'categories' | 'packages' | 'repairs'

export const resetApi = {
  run: (scope: ResetScope) =>
    unwrap<{ detail: string; count: number }>(http.post(`/reset/${scope}/`)),
}
