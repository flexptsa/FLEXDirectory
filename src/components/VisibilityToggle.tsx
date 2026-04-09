'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface VisibilityToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function VisibilityToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: VisibilityToggleProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-lg border p-4', className)}>
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}
