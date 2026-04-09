import { createClient } from '@/lib/supabase/server'
import { ApproveRejectButtons } from './ApproveRejectButtons'
import type { AccessRequestWithUser } from '@/types'

export default async function RequestsPage() {
  const supabase = await createClient()

  const { data: requestsData, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('[RequestsPage] access_requests error:', error.message, error.details, error.hint)
  }

  const userIds = (requestsData ?? []).map(r => r.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .in('id', userIds)

  const requests = (requestsData ?? []).map(r => ({
    ...r,
    user: users?.find(u => u.id === r.user_id) ?? null
  })) as AccessRequestWithUser[]

  const pending = requests.filter(r => r.status === 'pending')
  const reviewed = requests.filter(r => r.status === 'approved' || r.status === 'rejected')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Access requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {pending.length === 0 ? 'No pending requests.' : `${pending.length} pending`}
        </p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((req) => (
            <div
              key={req.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{req.user?.email}</p>
                {req.user?.full_name && (
                  <p className="text-sm text-slate-500">{req.user.full_name}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  Requested {new Date(req.requested_at).toLocaleDateString()}
                </p>
              </div>
              <ApproveRejectButtons requestId={req.id} userId={req.user_id} />
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Previously reviewed</h2>
          {reviewed.map((req) => (
            <div
              key={req.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm opacity-75"
            >
              <div>
                <p className="font-medium text-slate-900">{req.user?.email}</p>
                {req.user?.full_name && (
                  <p className="text-sm text-slate-500">{req.user.full_name}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  Requested {new Date(req.requested_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  req.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {req.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
