import Link from 'next/link'

const sections = [
  {
    href: '/admin/requests',
    label: 'Access requests',
    description: 'Review and approve pending family access requests.',
  },
  {
    href: '/admin/photos',
    label: 'Photo moderation',
    description: 'Approve or hide student photos awaiting review.',
  },
  {
    href: '/admin/users',
    label: 'User management',
    description: 'View all users, update roles, and revoke access.',
  },
  {
    href: '/admin/approved-emails',
    label: 'Approved emails',
    description: 'Pre-approve family emails so they get instant access.',
  },
  {
  href: '/admin/grade-advance',
  label: 'End-of-year grade advance',
  description: 'Advance student grades and mark graduating students as alumni.',
},
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <img
          src="/images/PTSA-Logo-Transparent.png"
          alt="Crossroads FLEX PTSA"
          className="h-10 w-auto"
        />
        <div>
          <h1 className="text-2xl font-bold text-[#002554]">Admin dashboard</h1>
          <p className="text-sm text-slate-500">Crossroads FLEX Family Directory</p>
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <p className="font-semibold text-[#002554]">{section.label}</p>
            <p className="mt-1 text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
