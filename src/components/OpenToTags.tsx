import { Car, BookOpen, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OpenToTagsProps {
  carpool: boolean
  studyGroups: boolean
  socialMeetups: boolean
  className?: string
}

export function OpenToTags({ carpool, studyGroups, socialMeetups, className }: OpenToTagsProps) {
  const tags = [
    { show: carpool, label: 'Carpool', icon: Car },
    { show: studyGroups, label: 'Study groups', icon: BookOpen },
    { show: socialMeetups, label: 'Meetups', icon: Users },
  ].filter((t) => t.show)

  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map(({ label, icon: Icon }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  )
}
