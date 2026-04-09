'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Mail, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VisibilityToggle } from '@/components/VisibilityToggle'
import { upsertParent, deleteParent, sendFamilyInvite } from '@/lib/actions/family'
import { uploadPhotoBase64 } from '@/lib/actions/photo'
import type { DbParent } from '@/types'

interface Props {
  parent?: DbParent | null
  familyId: string
  displayOrder: number
  signedPhotoUrl?: string | null
}

export function ProfileParentForm({ parent, familyId, displayOrder, signedPhotoUrl }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isSendingInvite, startInviteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteSentAt, setInviteSentAt] = useState<string | null>(parent?.invite_sent_at ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhotoBase64, setPendingPhotoBase64] = useState<string | null>(null)
  const [pendingPhotoMime, setPendingPhotoMime] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    first_name: parent?.first_name ?? '',
    last_name: parent?.last_name ?? '',
    email: parent?.email ?? '',
    phone: parent?.phone ?? '',
    show_email: parent?.show_email ?? false,
    show_phone: parent?.show_phone ?? false,
    show_on_student_profile: parent?.show_on_student_profile ?? true,
    show_photo: parent?.show_photo ?? true,
    invite_email: parent?.invite_email ?? '',
    display_order: parent?.display_order ?? displayOrder,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setPhotoError('Only JPG and PNG files are allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('File must be under 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPhotoPreview(dataUrl)
      setPendingPhotoBase64(dataUrl.split(',')[1])
      setPendingPhotoMime(file.type as 'image/jpeg' | 'image/png')
    }
    reader.readAsDataURL(file)
  }

  function clearPendingPhoto() {
    setPhotoPreview(null)
    setPendingPhotoBase64(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    setError(null)
    startTransition(async () => {
      const result = await upsertParent(parent?.id ?? null, familyId, form)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }

      if (pendingPhotoBase64 && result.parentId) {
        const photoResult = await uploadPhotoBase64({
          base64: pendingPhotoBase64,
          mimeType: pendingPhotoMime,
          type: 'parent',
          familyId,
          parentId: result.parentId,
        })
        if (!photoResult.success) { setError(`Saved, but photo upload failed: ${photoResult.error}`); return }
      }

      router.push('/account/profile/parents')
    })
  }

  function handleDelete() {
    if (!parent?.id) return
    startDeleteTransition(async () => {
      const result = await deleteParent(parent.id)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      router.push('/account/profile/parents')
    })
  }

  function handleSendInvite() {
    if (!form.invite_email.trim()) { setInviteError('Enter an email address first.'); return }
    if (!parent?.id) { setInviteError('Save this parent first.'); return }
    setInviteError(null)
    startInviteTransition(async () => {
      const result = await sendFamilyInvite(parent.id, 'parent', form.invite_email)
      if (!result.success) { setInviteError(result.error ?? 'Something went wrong.'); return }
      setInviteSent(true)
      setInviteSentAt(new Date().toISOString())
      setTimeout(() => setInviteSent(false), 3000)
    })
  }

  const displayPhoto = photoPreview ?? signedPhotoUrl

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name *</Label>
          <Input id="first_name" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Alex" required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="last_name" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" maxLength={100} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Photo <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
            {displayPhoto ? (
              <img src={displayPhoto} alt={form.first_name || 'Parent'} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
            {photoPreview && (
              <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] text-white">New</div>
            )}
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="sr-only" id="parent-photo-input" onChange={handleFileChange} />
              <label htmlFor="parent-photo-input">
                <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                  <span><Upload className="h-3 w-3" />{displayPhoto ? 'Replace' : 'Upload'}</span>
                </Button>
              </label>
              {photoPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={clearPendingPhoto} className="gap-1 text-muted-foreground">
                  <X className="h-3 w-3" />Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG or PNG · max 5 MB</p>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="alex@example.com" maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(919) 555-0100" maxLength={50} />
        </div>
      </div>

      <div className="space-y-2">
        <VisibilityToggle id="show_on_student_profile" label="Show on student profiles" description="This parent's name and photo appear in the Family section of each student's profile." checked={form.show_on_student_profile} onCheckedChange={v => set('show_on_student_profile', v)} />
        <VisibilityToggle id="show_photo" label="Show photo" description="Display this parent's photo in the directory." checked={form.show_photo} onCheckedChange={v => set('show_photo', v)} disabled={!displayPhoto} />
        <VisibilityToggle id="show_email" label="Show email" description="Display email to other directory members." checked={form.show_email} onCheckedChange={v => set('show_email', v)} disabled={!form.email.trim()} />
        <VisibilityToggle id="show_phone" label="Show phone" description="Display phone number to other directory members." checked={form.show_phone} onCheckedChange={v => set('show_phone', v)} disabled={!form.phone.trim()} />
      </div>

      <div className="space-y-2 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invite to directory</p>
        <p className="text-xs text-slate-500">Send a magic link so this person can log in and manage their own profile.</p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={form.invite_email}
            onChange={e => set('invite_email', e.target.value)}
            placeholder="their@email.com"
            className="text-sm"
            maxLength={200}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleSendInvite} disabled={isSendingInvite} className="shrink-0 gap-1">
            <Mail className="h-3 w-3" />
            {isSendingInvite ? 'Sending…' : inviteSent ? 'Sent!' : 'Send invite'}
          </Button>
        </div>
        {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
        {!parent?.id && (
          <p className="text-xs text-slate-400">Save this parent first to send an invite.</p>
        )}
        {inviteSentAt && !inviteError && (
          <p className="text-xs text-slate-400">Last invited {new Date(inviteSentAt).toLocaleDateString()}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : parent ? 'Save changes' : 'Save parent'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/account/profile/parents')}>
            Cancel
          </Button>
        </div>
        {parent && (
          !confirmDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4" />Remove
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-700">Remove this parent?</span>
              <Button type="button" size="sm" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? '…' : 'Yes, remove'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          )
        )}
      </div>
    </form>
  )
}
