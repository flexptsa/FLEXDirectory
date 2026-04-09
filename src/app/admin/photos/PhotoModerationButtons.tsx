'use client'

import { useTransition } from 'react'
import { approveStudentPhoto, hidePhoto } from '@/lib/actions/admin'

interface Props {
  studentId: string
  photoUrl: string
  familyId: string
}

export function PhotoModerationButtons({ studentId, photoUrl, familyId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      await approveStudentPhoto(studentId, photoUrl, familyId)
    })
  }

  function handleHide() {
    startTransition(async () => {
      await hidePhoto(studentId, photoUrl, familyId)
    })
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={handleApprove}
        disabled={pending}
        className="flex-1 py-1.5 text-sm font-medium rounded-lg bg-[#002554] text-white hover:bg-[#003a7a] disabled:opacity-50 transition"
      >
        Approve
      </button>
      <button
        onClick={handleHide}
        disabled={pending}
        className="flex-1 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
      >
        Hide
      </button>
    </div>
  )
}
