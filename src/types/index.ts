// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'pending' | 'parent' | 'member' | 'moderator' | 'super_admin'
export type PhotoStatus = 'none' | 'pending' | 'approved' | 'hidden'
export type PhotoType = 'parent' | 'student'
export type PhotoAction = 'approved' | 'hidden' | 'removed'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

// ─── Database row types ───────────────────────────────────────────────────────

export interface DbUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_approved: boolean
  created_at: string
  last_login_at: string | null
}

export interface DbFamily {
  id: string
  owner_user_id: string
  family_display_name: string
  general_location: string | null
  family_bio: string | null
  show_location: boolean
  open_to_carpool: boolean
  open_to_study_groups: boolean
  open_to_social_meetups: boolean
  photo_url: string | null
  deleted_at: string | null
  purge_after: string | null
  created_at: string
  updated_at: string
}

export interface DbParent {
  id: string
  family_id: string
  first_name: string
  last_name: string | null
  photo_url: string | null
  email: string | null
  phone: string | null
  show_email: boolean
  show_phone: boolean
  show_on_student_profile: boolean
  show_photo: boolean
  invite_email: string | null
  invite_sent_at: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface DbStudent {
  id: string
  family_id: string
  first_name: string
  last_name: string | null
  grade: string
  primary_pursuit: string
  secondary_pursuit: string | null
  short_bio: string | null
  organization: string | null
  fun_facts: string | null
  student_photo_url: string | null
  student_photo_status: PhotoStatus
  is_listed_in_directory: boolean
  show_student_photo: boolean
  invite_email: string | null
  invite_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface DbClubTag {
  id: string
  name: string
}

export interface DbPursuitTag {
  id: string
  name: string
}

export interface DbPhotoModerationLog {
  id: string
  family_id: string | null
  student_id: string | null
  photo_type: PhotoType
  photo_url: string
  action: PhotoAction
  admin_note: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string
}

export interface DbContactMessage {
  id: string
  sender_user_id: string
  recipient_family_id: string
  message_body: string
  sent_at: string
  delivered: boolean
}

export interface DbAccessRequest {
  id: string
  user_id: string
  requested_at: string
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

// ─── Composite / view types ───────────────────────────────────────────────────

/** Student joined with its family and parents — used for directory cards and profile pages */
export interface StudentWithFamily extends DbStudent {
  clubs?: DbClubTag[]
  siblings?: Pick<DbStudent, 'id' | 'first_name' | 'last_name' | 'student_photo_url' | 'student_photo_status' | 'show_student_photo'>[]
  family: Pick<
    DbFamily,
    | 'id'
    | 'family_display_name'
    | 'general_location'
    | 'show_location'
    | 'open_to_carpool'
    | 'open_to_study_groups'
    | 'open_to_social_meetups'
  > & {
    parents: Pick<DbParent, 'id' | 'first_name' | 'last_name' | 'photo_url' | 'show_photo' | 'show_on_student_profile'>[]
  }
}

/** Family with its parents and listed students — used for family profile page */
export interface FamilyWithStudents extends DbFamily {
  parents: DbParent[]
  students: DbStudent[]
}

/** Access request joined with user — used in admin request queue */
export interface AccessRequestWithUser extends DbAccessRequest {
  user: Pick<DbUser, 'email' | 'full_name'>
}

// ─── Form state types ─────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
}

export interface FamilyFormData {
  family_display_name: string
  general_location: string
  family_bio: string
  show_location: boolean
  open_to_carpool: boolean
  open_to_study_groups: boolean
  open_to_social_meetups: boolean
}

export interface ParentFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  show_email: boolean
  show_phone: boolean
  show_on_student_profile: boolean
  show_photo: boolean
  invite_email: string
  display_order: number
}

export interface StudentFormData {
  first_name: string
  last_name: string
  grade: string
  primary_pursuit: string
  secondary_pursuit: string
  short_bio: string
  is_listed_in_directory: boolean
  show_student_photo: boolean
}

// ─── Directory filter types ───────────────────────────────────────────────────

export interface DirectoryFilters {
  search: string
  grades: string[]
  pursuits: string[]
  openTo: ('carpool' | 'study_groups' | 'social_meetups')[]
  sort: 'grade' | 'name' | 'recent'
}

export const GRADES = ['9th', '10th', '11th', '12th']
