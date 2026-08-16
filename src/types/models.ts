/**
 * Bentuk data yang dikirim API SIMANTAP.
 *
 * Ditulis manual dan sengaja dijaga sinkron dengan serializer di backend —
 * setiap field di sini punya pasangan yang bisa ditunjuk di `simantap-be`.
 */

// ─── Peran ──────────────────────────────────────────────────────────────────
export const ROLES = [
  'superadmin',
  'admin',
  'pemohon',
  'supervisor',
  'admin_gudang',
  'inventory_staff',
  'it_staff_pembantu',
  'administrator_pembantu_manajemen_user',
  'administrator_pembantu_manajemen_alat',
  'administrator_pembantu_manajemen_kategori',
  'pimpinan',
] as const

export type Role = (typeof ROLES)[number]

export type RegistrationStatus = 'approved' | 'pending' | 'rejected'

// ─── Pengguna ───────────────────────────────────────────────────────────────
export interface UserSlim {
  uuid: string
  id: number
  name: string
  email: string
  role: Role
  role_label: string
  unit_kerja: string | null
  photo_url: string | null
}

export interface CurrentUser extends UserSlim {
  roles: Role[]
  phone: string | null
  telegram_chat_id: string | null
  is_active: boolean
  reg_status: RegistrationStatus
  is_pure_requester: boolean
  is_personal_borrower: boolean
}

export interface UserListItem extends UserSlim {
  extra_roles: Array<{ value: Role; label: string }>
  phone: string | null
  is_active: boolean
  reg_status: RegistrationStatus
  created_at: string
  updated_at: string
}

export interface UserDetail extends UserListItem, AuditTrail {}

export interface RegistrationRow {
  uuid: string
  id: number
  name: string
  email: string
  role: Role
  role_label: string
  phone: string | null
  unit_kerja: string | null
  photo_url: string | null
  reg_status: RegistrationStatus
  created_at: string
  verified_by_name: string | null
  verified_at: string | null
}

// ─── Jejak audit ────────────────────────────────────────────────────────────
export interface AuditTrail {
  created_by_name: string | null
  updated_by_name: string | null
  restored_by_name: string | null
}

// ─── Master data ────────────────────────────────────────────────────────────
export type AssetStatus =
  | 'Available'
  | 'Booked'
  | 'CheckedOut'
  | 'Damaged'
  | 'Retired'
  | 'Lost'
  | 'Habis'
  | 'AtOpd'

export interface Category extends AuditTrail {
  uuid: string
  id: number
  name: string
  code_prefix: string | null
  description: string | null
  asset_count: number
}

export interface AssetSlim {
  uuid: string
  id: number
  asset_code: string
  bmn_number: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  barcode: string
  category: number | null
  category_name: string | null
  status: AssetStatus
  status_label: string
  photo_url: string | null
  unit: string | null
  qty_current: string | null
}

export interface Asset extends AssetSlim {
  condition_note: string | null
  purchase_price: string | null
  purchase_date: string | null
  current_value: string | null
  qty_initial: string | null
  is_consumable: boolean
  created_at: string
  updated_at: string
  has_loan_history: boolean
  updated_by_name: string | null
}

export interface AssetDetail extends Asset {
  created_by_name: string | null
  restored_by_name: string | null
}

export interface Package extends AuditTrail {
  uuid: string
  id: number
  name: string
  description: string | null
  is_active: boolean
  item_count: number
  items: Array<Pick<AssetSlim, 'uuid' | 'id' | 'name' | 'asset_code' | 'bmn_number' | 'status'>>
}

// ─── Peminjaman ─────────────────────────────────────────────────────────────
export type LoanStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'CheckedOut'
  | 'Returned'
  | 'Completed'
  | 'Cancelled'

export type LoanType = 'event' | 'opd'

export type LoanItemStatus =
  | 'Reserved'
  | 'CheckedOut'
  | 'ReturnedGood'
  | 'ReturnedDamaged'
  | 'ReturnedLost'
  | 'InRepair'
  | 'Restored'
  | 'AtOpd'

export type ReturnCondition = 'Good' | 'Damaged' | 'Lost'

export interface LoanItem {
  id: number
  asset_uuid: string
  asset_name: string
  asset_code: string
  bmn_number: string
  barcode: string
  brand: string | null
  model: string | null
  serial_number: string | null
  unit: string | null
  qty_current: string | null
  purchase_price: string | null
  current_value: string | null
  category_name: string | null
  package_name: string | null
  photo_url: string | null
  item_status: LoanItemStatus
  item_status_label: string
  return_condition: ReturnCondition | null
  damage_note: string | null
  checkout_at: string | null
  checkin_at: string | null
  is_consumable: boolean
  will_return: boolean
  expected_return_date: string | null
}

export interface Loan {
  uuid: string
  id: number
  loan_code: string
  event_name: string
  event_location: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  purpose: string | null
  status: LoanStatus
  status_label: string
  loan_type: LoanType
  will_return: boolean
  requester_name: string
  requester_unit: string | null
  supervisor_name: string | null
  participants: string[]
  item_count: number
  asset_names: string[]
  /** Diajukan sendiri (bukan sekadar dilibatkan sebagai personel). */
  is_mine: boolean
  /** Hanya terisi pada daftar OPD di dashboard. */
  pending_return?: number
  /** Barang yang sudah diproses pada antrean Penyerahan / Pengembalian. */
  progress_done: number | null
  approved_at: string | null
  checkout_at: string | null
  checkin_at: string | null
  created_at: string
}

export interface LoanDetail extends Loan, AuditTrail {
  items: LoanItem[]
  approval_note: string | null
  participant_details: UserSlim[]
}

export interface BorrowedItem {
  id: number
  asset_name: string
  asset_code: string
  bmn_number: string
  loan_uuid: string
  loan_code: string
  event_name: string
  loan_type: LoanType
  checkout_at: string | null
  end_date: string
  expected_return_date: string | null
  requester_name: string
  personnel: string[]
}

export interface OpdItemRow {
  id: number
  loan_uuid: string
  loan_code: string
  opd_name: string
  checkout_at: string | null
  requester_name: string
  asset_name: string
  asset_code: string
  bmn_number: string
  brand: string | null
  model: string | null
  serial_number: string | null
  personnel: string[]
  item_status: LoanItemStatus
  item_status_label: string
  will_return: boolean
  expected_return_date: string | null
}

// ─── Perbaikan ──────────────────────────────────────────────────────────────
export type RepairStatus = 'Open' | 'FormPrinted' | 'InRepair' | 'Completed'

export interface Repair {
  uuid: string
  id: number
  repair_code: string
  asset_name: string
  asset_code: string
  bmn_number: string
  complaint: string
  status: RepairStatus
  status_label: string
  form_printed_at: string | null
  technician_name: string | null
  action_taken: string | null
  completed_by_name: string | null
  completed_at: string | null
  created_at: string
}

export interface RepairDetail extends Repair, AuditTrail {
  brand: string | null
  model: string | null
  serial_number: string | null
  loan_code: string | null
  loan_uuid: string | null
  requester_name: string | null
  requester_unit: string | null
}

// ─── Notifikasi ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  archived_at: string | null
  created_at: string
}

export interface NotificationLogRow extends Notification {
  user_name: string
  user_role: Role
  user_role_label: string
  telegram_attempted: boolean
}

// ─── Riwayat Terhapus ───────────────────────────────────────────────────────
export type TrashEntity =
  | 'users'
  | 'categories'
  | 'assets'
  | 'packages'
  | 'loans'
  | 'repairs'

export interface TrashRow {
  type: TrashEntity
  type_label: string
  id: number
  label: string
  deleted_at: string | null
  deleted_by_name: string | null
  restored_at: string | null
  restored_by_name: string | null
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_assets: number
  available: number
  checked_out: number
  damaged: number
  pending_approvals: number
  active_loans: number
  items_pending: number
  items_approved: number
  opd_out: number
  opd_consumable: number
}

export interface DashboardPayload {
  stats: DashboardStats
  asset_breakdown: string[]
  my_loans: Loan[]
  recent_damage: Repair[]
  schedule_loans: Loan[]
  past_loans: Loan[]
  show_schedule: boolean
  opd_out: Loan[]
  borrowed_items: BorrowedItem[]
}

// ─── Umum ───────────────────────────────────────────────────────────────────
export interface Paginated<T> {
  results: T[]
  count: number
  page: number
  pages: number
  page_size: number
}

export interface Option<T = string> {
  value: T
  label: string
}

export interface AppConfig {
  app_name: string
  google_enabled: boolean
  turnstile_enabled: boolean
  turnstile_site_key: string
  telegram_enabled: boolean
  telegram_bot_username: string
}
