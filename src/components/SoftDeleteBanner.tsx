'use client'

import { useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelFamilyDeletion } from '@/lib/actions/family'

interface SoftDeleteBannerProps {
  purgeAfter: string // ISO date string
  familyId: string
}

export function SoftDeleteBanner({ purgeAfter, familyId }: SoftDeleteBannerProps) {
  const [isPending, startTransition] = useTransition()

  const purgeDate = new Date(purgeAfter).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  function handleCancel() {
    startTransition(async () => {
      await cancelFamilyDeletion(familyId)
    })
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-amber-900">Profile deletion scheduled</p>
        <p className="text-sm text-amber-800">
          Your profile and all student records will be permanently deleted on{' '}
          <strong>{purgeDate}</strong>. This cannot be undone after that date.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
        className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100"
      >
        {isPending ? 'Cancelling…' : 'Cancel deletion'}
      </Button>
    </div>
  )
}
