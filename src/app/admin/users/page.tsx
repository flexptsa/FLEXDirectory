import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRoleSelect } from './UserRoleSelect'
import type { DbUser } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  pending: 'Pending',
  parent: 'Parent',
  moderator: 'Moderator',
  super_admin: 'Super admin',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/admin')

  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_approved, last_login_at, created_at')
    .order('created_at', { ascending: false })

  const users = (data ?? []) as DbUser[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">User management</h1>
        <p className="text-sm text-slate-500 mt-0.5">{users.length} total user{users.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
              <div>
                <p className="font-medium text-slate-900">{u.email}</p>
                {u.full_name && <p className="text-sm text-slate-500">{u.full_name}</p>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  u.is_approved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {u.is_approved ? 'Approved' : 'Not approved'}
                </span>
                <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-400 space-y-0.5">
                <p>Joined {new Date(u.created_at).toLocaleDateString()}</p>
                {u.last_login_at && (
                  <p>Last login {new Date(u.last_login_at).toLocaleDateString()}</p>
                )}
              </div>
              {u.id !== user.id && (
                <UserRoleSelect
                  userId={u.id}
                  currentRole={u.role}
                  isApproved={u.is_approved}
                />
              )}
              {u.id === user.id && (
                <span className="text-xs text-slate-400 italic">You</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
