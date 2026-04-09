'use client'

import { useTransition } from 'react'
import { approveAccessRequest, rejectAccessRequest } from '@/lib/actions/admin'

interface Props {
  requestId: string
  userId: string
}

export function ApproveRejectButtons({ requestId, userId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      await approveAccessRequest(requestId, userId)
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectAccessRequest(requestId)
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={pending}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#002554] text-white hover:bg-[#003a7a] disabled:opacity-50 transition"
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={pending}
        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
      >
        Reject
      </button>
    </div>
  )
}
