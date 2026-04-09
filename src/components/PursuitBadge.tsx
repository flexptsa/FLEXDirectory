import { cn } from '@/lib/utils'

const PURSUIT_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-rose-100 text-rose-800',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

interface PursuitBadgeProps {
  pursuit: string
  className?: string
}

export function PursuitBadge({ pursuit, className }: PursuitBadgeProps) {
  const colorClass = PURSUIT_COLORS[hashString(pursuit) % PURSUIT_COLORS.length]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass, className)}>
      {pursuit}
    </span>
  )
}
