import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ProfileParentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('owner_user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!family) redirect('/account/profile/family')

  const { data: parents } = await supabase
    .from('parents')
    .select('id, first_name, last_name, email, display_order')
    .eq('family_id', family.id)
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#002554]">Parents &amp; guardians</h1>
          <p className="text-sm text-slate-500 mt-0.5">Add the parents or guardians in your family.</p>
        </div>
        <Link
          href="/account/profile/parents/new"
          className="inline-flex shrink-0 items-center gap-1.5 bg-[#002554] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#003a7a] transition"
        >
          <Plus className="h-4 w-4" />
          Add parent
        </Link>
      </div>

      {(parents ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center space-y-2">
          <p className="text-slate-600 font-medium">No parents added yet</p>
          <p className="text-sm text-slate-500">Add a parent or guardian to show on your family profile.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(parents ?? []).map((parent) => (
            <div
              key={parent.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {parent.first_name}{parent.last_name ? ` ${parent.last_name}` : ''}
                </p>
                {parent.email && (
                  <p className="text-sm text-slate-500">{parent.email}</p>
                )}
              </div>
              <Link
                href={`/account/profile/parents/${parent.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#002554] transition"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Link
          href="/account/profile/family"
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          ← Back: Family
        </Link>
        <Link
          href="/account/profile/students"
          className="inline-flex items-center gap-1.5 bg-[#002554] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#003a7a] transition"
        >
          Next: Students →
        </Link>
      </div>
    </div>
  )
}
