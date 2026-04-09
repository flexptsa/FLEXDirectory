'use client'

import { useTransition } from 'react'
import { updateUserRole, revokeAccess } from '@/lib/actions/admin'
import type { UserRole } from '@/types'

interface Props {
  userId: string
  currentRole: UserRole
  isApproved: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'super_admin', label: 'Super admin' },
]

export function UserRoleSelect({ userId, currentRole, isApproved }: Props) {
  const [pending, startTransition] = useTransition()

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as 'parent' | 'moderator' | 'super_admin'
    startTransition(async () => {
      await updateUserRole(userId, newRole)
    })
  }

  function handleRevoke() {
    startTransition(async () => {
      await revokeAccess(userId)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentRole === 'pending' ? '' : currentRole}
        onChange={handleRoleChange}
        disabled={pending || !isApproved || currentRole === 'pending'}
        className="text-sm rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002554] disabled:opacity-50"
      >
        {currentRole === 'pending' && <option value="">pending</option>}
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {isApproved && (
        <button
          onClick={handleRevoke}
          disabled={pending}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
        >
          Revoke
        </button>
      )}
    </div>
  )
}
