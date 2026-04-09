import { Badge } from '@/components/ui/badge'
import type { PhotoStatus, RequestStatus } from '@/types'

interface ApprovalBadgeProps {
  status: PhotoStatus | RequestStatus | 'active'
}

export function ApprovalBadge({ status }: ApprovalBadgeProps) {
  switch (status) {
    case 'approved':
    case 'active':
      return <Badge variant="success">Approved</Badge>
    case 'pending':
      return <Badge variant="warning">Pending review</Badge>
    case 'hidden':
      return <Badge variant="destructive">Hidden</Badge>
    case 'rejected':
      return <Badge variant="outline">Rejected</Badge>
    case 'none':
      return <Badge variant="outline">No photo</Badge>
    default:
      return null
  }
}
