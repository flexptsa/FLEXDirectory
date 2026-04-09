'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { upsertFamily } from '@/lib/actions/family'
import { uploadPhotoBase64, removePhoto } from '@/lib/actions/photo'
import type { DbFamily } from '@/types'

interface Props {
  family: DbFamily | null
  familyPhotoSignedUrl: string | null
}

export function ProfileFamilyForm({ family, familyPhotoSignedUrl }: Props) {
  const router = useRouter()
  const [isSaving, startSaveTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [familyPhotoPreview, setFamilyPhotoPreview] = useState<string | null>(null)
  const [familyPendingBase64, setFamilyPendingBase64] = useState<string | null>(null)
  const [familyPendingMime, setFamilyPendingMime] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [familyPhotoError, setFamilyPhotoError] = useState<string | null>(null)
  const [familyPhotoUploading, setFamilyPhotoUploading] = useState(false)
  const [currentFamilyPhotoUrl, setCurrentFamilyPhotoUrl] = useState<string | null>(familyPhotoSignedUrl)
  const familyFileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    family_display_name: family?.family_display_name ?? '',
    family_bio: family?.family_bio ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFamilyPhotoError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setFamilyPhotoError('Only JPG and PNG files are allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { setFamilyPhotoError('File must be under 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setFamilyPhotoPreview(dataUrl)
      setFamilyPendingBase64(dataUrl.split(',')[1])
      setFamilyPendingMime(file.type as 'image/jpeg' | 'image/png')
    }
    reader.readAsDataURL(file)
  }

  async function handlePhotoUpload() {
    if (!familyPendingBase64 || !family) return
    setFamilyPhotoUploading(true)
    setFamilyPhotoError(null)
    const result = await uploadPhotoBase64({
      base64: familyPendingBase64,
      mimeType: familyPendingMime,
      type: 'family',
      familyId: family.id,
    })
    setFamilyPhotoUploading(false)
    if (!result.success) { setFamilyPhotoError(result.error ?? 'Upload failed.'); return }
    setCurrentFamilyPhotoUrl(familyPhotoPreview)
    setFamilyPhotoPreview(null)
    setFamilyPendingBase64(null)
    if (familyFileInputRef.current) familyFileInputRef.current.value = ''
  }

  async function handlePhotoRemove() {
    if (!family) return
    setFamilyPhotoError(null)
    const result = await removePhoto({ type: 'family', familyId: family.id })
    if (!result.success) { setFamilyPhotoError(result.error ?? 'Remove failed.'); return }
    setCurrentFamilyPhotoUrl(null)
    setFamilyPhotoPreview(null)
    setFamilyPendingBase64(null)
    if (familyFileInputRef.current) familyFileInputRef.current.value = ''
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.family_display_name.trim()) { setError('Family name is required.'); return }
    setError(null)
    startSaveTransition(async () => {
      const result = await upsertFamily(family?.id ?? null, {
        family_display_name: form.family_display_name,
        family_bio: form.family_bio,
        general_location: family?.general_location ?? '',
        show_location: family?.show_location ?? true,
        open_to_carpool: family?.open_to_carpool ?? false,
        open_to_study_groups: family?.open_to_study_groups ?? false,
        open_to_social_meetups: family?.open_to_social_meetups ?? false,
      })
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      router.push('/account/profile/parents')
    })
  }

  const displayPhoto = familyPhotoPreview ?? currentFamilyPhotoUrl

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="family_display_name">Family name *</Label>
        <Input
          id="family_display_name"
          value={form.family_display_name}
          onChange={e => set('family_display_name', e.target.value)}
          placeholder="Smith"
          required
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">
          Displayed as: <span className="font-medium text-slate-700">The {form.family_display_name.trim() || 'Smith'} Family</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="family_bio">
          Fun facts <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          id="family_bio"
          value={form.family_bio}
          onChange={e => set('family_bio', e.target.value)}
          placeholder={"Vanderbilt Alumni\nFrom Boston\nAvid hikers"}
          rows={4}
          className="resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">One per line. Shown as bullet points on your family profile.</p>
      </div>

      {family ? (
        <div className="space-y-2">
          <Label>
            Family photo <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Family" className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              {familyPhotoPreview && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] text-white">New</div>
              )}
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={familyFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  id="family-photo-input"
                  onChange={handleFileChange}
                />
                <label htmlFor="family-photo-input">
                  <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                    <span><Upload className="h-3 w-3" />{currentFamilyPhotoUrl ? 'Replace' : 'Upload'}</span>
                  </Button>
                </label>
                {familyPhotoPreview && (
                  <Button type="button" size="sm" onClick={handlePhotoUpload} disabled={familyPhotoUploading} className="gap-1">
                    {familyPhotoUploading ? 'Uploading…' : 'Save photo'}
                  </Button>
                )}
                {currentFamilyPhotoUrl && !familyPhotoPreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={handlePhotoRemove} className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <X className="h-3 w-3" />Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG or PNG · max 5 MB</p>
              {familyPhotoError && <p className="text-xs text-destructive">{familyPhotoError}</p>}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
          Save your family info first to unlock photo upload.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save & continue'}
        </Button>
        {family && (
          <Button type="button" variant="outline" onClick={() => router.push('/account/profile/parents')}>
            Next: Parents →
          </Button>
        )}
      </div>
    </form>
  )
}
