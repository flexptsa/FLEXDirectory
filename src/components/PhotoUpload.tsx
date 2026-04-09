'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Upload, X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadPhotoBase64, removePhoto } from '@/lib/actions/photo'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  type: 'parent' | 'student'
  familyId: string
  studentId?: string
  currentPhotoUrl?: string | null
  currentStatus?: 'none' | 'pending' | 'approved' | 'hidden'
  onComplete?: () => void
}

export function PhotoUpload({
  type,
  familyId,
  studentId,
  currentPhotoUrl,
  currentStatus = 'none',
  onComplete,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)

  const hasPhoto = currentStatus !== 'none' && currentPhotoUrl
  const isStudentPending = type === 'student' && currentStatus === 'pending'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.')
      return
    }

    fileRef.current = file
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleUpload() {
    const file = fileRef.current
    if (!file) return

    startTransition(async () => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await uploadPhotoBase64({
        base64,
        mimeType: file.type as 'image/jpeg' | 'image/png',
        type,
        familyId,
        studentId,
      })

      if (result.success) {
        setPreview(null)
        fileRef.current = null
        if (inputRef.current) inputRef.current.value = ''
        onComplete?.()
      } else {
        setError(result.error ?? 'Upload failed.')
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removePhoto({ type, familyId, studentId })
      if (result.success) {
        setPreview(null)
        onComplete?.()
      } else {
        setError(result.error ?? 'Remove failed.')
      }
    })
  }

  return (
    <div className="space-y-3">
      {!preview && (
        <div className={cn(
          'relative h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted',
          hasPhoto && 'border-solid border-border'
        )}>
          {hasPhoto && currentPhotoUrl ? (
            <Image src={currentPhotoUrl} alt="Current photo" fill className="object-cover" sizes="128px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-primary">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        </div>
      )}

      {isStudentPending && !preview && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Photo pending admin review — not yet visible to other families.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!preview && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              id={`photo-input-${type}-${familyId}`}
              onChange={handleFileChange}
              aria-label={`Upload ${type} photo`}
            />
            <label htmlFor={`photo-input-${type}-${familyId}`}>
              <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                <span>
                  <Upload className="h-3 w-3" />
                  {hasPhoto ? 'Replace photo' : 'Upload photo'}
                </span>
              </Button>
            </label>
          </>
        )}

        {preview && (
          <>
            <Button type="button" size="sm" onClick={handleUpload} disabled={isPending}>
              {isPending ? 'Uploading…' : 'Save photo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPreview(null)
                fileRef.current = null
                if (inputRef.current) inputRef.current.value = ''
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </>
        )}

        {hasPhoto && !preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isPending}
            className="text-destructive hover:text-destructive gap-1"
          >
            <X className="h-3 w-3" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPG or PNG, max 5 MB.
        {type === 'student' && ' Student photos require admin approval before becoming visible.'}
      </p>
    </div>
  )
}
