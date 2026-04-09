import Link from 'next/link'
import type { StudentWithFamily } from '@/types'

interface StudentCardProps {
  student: StudentWithFamily
  photoUrl?: string | null
}

export function StudentCard({ student, photoUrl }: StudentCardProps) {
const approvedPhotoUrl =
  student.show_student_photo &&
  student.student_photo_status === 'approved' &&
  photoUrl
    ? photoUrl
    : null

const fallbackIndex =
  student.first_name && student.last_name
    ? (student.first_name.charCodeAt(0) + student.last_name.charCodeAt(0)) % 100
    : 0

const folder = fallbackIndex % 2 === 0 ? 'men' : 'women'
const displayPhotoUrl =
  approvedPhotoUrl ||
  (process.env.NODE_ENV === 'development'
    ? `https://randomuser.me/api/portraits/${folder}/${fallbackIndex}.jpg`
    : null)

  

  return (
    <Link
      href={`/directory/students/${student.id}`}
      className="group overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      <div className="aspect-[5/6] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
  {displayPhotoUrl ? (
    <img
      src={displayPhotoUrl}
      alt={`${student.first_name}${student.last_name ? ' ' + student.last_name : ''}`}
      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
    />
  ) : (
    <div className="flex h-full items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/75 ring-1 ring-slate-200">
        <span className="text-lg font-semibold tracking-tight text-slate-400">
          {initials || '•'}
        </span>
      </div>
    </div>
  )}
</div>

     <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-3.5">
        <h3 className="text-[1.05rem] font-semibold leading-tight text-slate-900">
          {student.first_name}
        </h3>

        {student.last_name && (
          <p className="mt-0.5 text-sm font-medium leading-tight text-slate-600">
            {student.last_name}
          </p>
        )}

        <p className="mt-1.5 text-xs font-semibold leading-snug">
          <span className="text-sky-700">{student.primary_pursuit}</span>
          {student.grade && <span className="text-slate-400"> · </span>}
          {student.grade && <span className="text-[#A67C00]">{student.grade} Grade</span>}
        </p>
      </div>
    </Link>
  )
}