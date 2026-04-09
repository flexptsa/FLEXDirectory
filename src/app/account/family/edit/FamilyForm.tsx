'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Mail, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VisibilityToggle } from '@/components/VisibilityToggle'
import { upsertFamily, softDeleteFamily, upsertParent, deleteParent, sendFamilyInvite } from '@/lib/actions/family'
import { uploadPhotoBase64, removePhoto } from '@/lib/actions/photo'
import type { DbFamily, DbParent, DbStudent } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalParent {
  id: string | null
  family_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  show_email: boolean
  show_phone: boolean
  show_on_student_profile: boolean
  show_photo: boolean
  invite_email: string
  invite_sent_at: string | null
  display_order: number
  signedPhotoUrl: string | null
}

interface StudentInviteData {
  id: string
  first_name: string
  last_name: string | null
  invite_email: string | null
  invite_sent_at: string | null
}

// ─── ParentCard ───────────────────────────────────────────────────────────────

interface ParentCardProps {
  parent: LocalParent
  onSaved: (parentId: string) => void
  onDeleted: () => void
}

function ParentCard({ parent, onSaved, onDeleted }: ParentCardProps) {
  const [isSaving, startSaveTransition] = useTransition()
  const [isSendingInvite, startInviteTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhotoBase64, setPendingPhotoBase64] = useState<string | null>(null)
  const [pendingPhotoMime, setPendingPhotoMime] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [currentParentId, setCurrentParentId] = useState<string | null>(parent.id)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(parent.signedPhotoUrl)
  const [inviteSentAt, setInviteSentAt] = useState<string | null>(parent.invite_sent_at)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uid = parent.id ?? `new-${parent.display_order}`

  const [form, setForm] = useState({
    first_name: parent.first_name,
    last_name: parent.last_name,
    email: parent.email,
    phone: parent.phone,
    show_email: parent.show_email,
    show_phone: parent.show_phone,
    show_on_student_profile: parent.show_on_student_profile,
    show_photo: parent.show_photo,
    invite_email: parent.invite_email,
    display_order: parent.display_order,
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

  function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    setError(null)
    startSaveTransition(async () => {
      const result = await upsertParent(currentParentId, parent.family_id, form)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }

      const newParentId = result.parentId!

      if (pendingPhotoBase64) {
        const photoResult = await uploadPhotoBase64({
          base64: pendingPhotoBase64,
          mimeType: pendingPhotoMime,
          type: 'parent',
          familyId: parent.family_id,
          parentId: newParentId,
        })
        if (!photoResult.success) { setError(`Saved, but photo upload failed: ${photoResult.error}`); return }
        setCurrentPhotoUrl(photoPreview)
        clearPendingPhoto()
      }

      if (!currentParentId) {
        setCurrentParentId(newParentId)
        onSaved(newParentId)
      }
    })
  }

  function handleDelete() {
    if (!currentParentId) { onDeleted(); return }
    startDeleteTransition(async () => {
      const result = await deleteParent(currentParentId)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      onDeleted()
    })
  }

  function handleSendInvite() {
    if (!form.invite_email.trim()) { setInviteError('Enter an email address first.'); return }
    if (!currentParentId) { setInviteError('Save this parent card first.'); return }
    setInviteError(null)
    startInviteTransition(async () => {
      const result = await sendFamilyInvite(currentParentId, 'parent', form.invite_email)
      if (!result.success) { setInviteError(result.error ?? 'Something went wrong.'); return }
      setInviteSent(true)
      setInviteSentAt(new Date().toISOString())
      setTimeout(() => setInviteSent(false), 3000)
    })
  }

  const displayPhoto = photoPreview ?? currentPhotoUrl

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
      {/* Name */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`parent-first-${uid}`}>First name *</Label>
          <Input
            id={`parent-first-${uid}`}
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            placeholder="Alex"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`parent-last-${uid}`}>Last name</Label>
          <Input
            id={`parent-last-${uid}`}
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            placeholder="Smith"
            maxLength={100}
          />
        </div>
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label>Photo</Label>
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
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="sr-only" id={`photo-input-${uid}`} onChange={handleFileChange} />
              <label htmlFor={`photo-input-${uid}`}>
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
            {!currentParentId && pendingPhotoBase64 && (
              <p className="text-xs text-amber-600">Save this card first to upload the photo.</p>
            )}
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`parent-email-${uid}`}>Email</Label>
          <Input id={`parent-email-${uid}`} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="alex@example.com" maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`parent-phone-${uid}`}>Phone</Label>
          <Input id={`parent-phone-${uid}`} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(919) 555-0100" maxLength={50} />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <VisibilityToggle id={`show_on_profile-${uid}`} label="Show on student profiles" description="This parent's name and photo appear in the Family section of each student's profile." checked={form.show_on_student_profile} onCheckedChange={v => set('show_on_student_profile', v)} />
        <VisibilityToggle id={`show_photo-${uid}`} label="Show photo" description="Display this parent's photo in the directory." checked={form.show_photo} onCheckedChange={v => set('show_photo', v)} disabled={!displayPhoto} />
        <VisibilityToggle id={`show_email-${uid}`} label="Show email" description="Display email to other directory members." checked={form.show_email} onCheckedChange={v => set('show_email', v)} disabled={!form.email.trim()} />
        <VisibilityToggle id={`show_phone-${uid}`} label="Show phone" description="Display phone number to other directory members." checked={form.show_phone} onCheckedChange={v => set('show_phone', v)} disabled={!form.phone.trim()} />
      </div>

      {/* Invite */}
      <div className="space-y-2 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invite to directory</p>
        <p className="text-xs text-slate-500">Send a magic link so this person can log in and manage their own profile.</p>
        <div className="flex gap-2">
          <Input
            id={`invite-email-${uid}`}
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
        {inviteSentAt && !inviteError && (
          <p className="text-xs text-slate-400">Last invited {new Date(inviteSentAt).toLocaleDateString()}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Card actions */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : currentParentId ? 'Save' : 'Save parent'}
        </Button>
        {!confirmDelete ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-3 w-3" />Remove
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-700">Remove this parent?</span>
            <Button type="button" size="sm" variant="destructive" disabled={isDeleting} onClick={handleDelete} className="h-7 px-3 text-xs">
              {isDeleting ? '…' : 'Yes'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-7 px-3 text-xs">No</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StudentInviteRow ─────────────────────────────────────────────────────────

function StudentInviteRow({ student }: { student: StudentInviteData }) {
  const [isSending, startTransition] = useTransition()
  const [email, setEmail] = useState(student.invite_email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sentAt, setSentAt] = useState<string | null>(student.invite_sent_at)

  function handleSend() {
    if (!email.trim()) { setError('Enter an email address.'); return }
    setError(null)
    startTransition(async () => {
      const result = await sendFamilyInvite(student.id, 'student', email)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      setSent(true)
      setSentAt(new Date().toISOString())
      setTimeout(() => setSent(false), 3000)
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {student.first_name}{student.last_name ? ` ${student.last_name}` : ''}
        </p>
        {sentAt && <p className="text-xs text-slate-400">Last invited {new Date(sentAt).toLocaleDateString()}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="h-8 w-48 text-sm"
          maxLength={200}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleSend} disabled={isSending} className="shrink-0 gap-1">
          <Mail className="h-3 w-3" />
          {isSending ? '…' : sent ? 'Sent!' : 'Send invite'}
        </Button>
      </div>
    </div>
  )
}

// ─── FamilyForm ───────────────────────────────────────────────────────────────

interface Props {
  family: DbFamily | null
  parents: (DbParent & { signedPhotoUrl: string | null })[]
  students: StudentInviteData[]
  familyPhotoSignedUrl: string | null
}

export function FamilyForm({ family, parents: initialParents, students, familyPhotoSignedUrl }: Props) {
  const router = useRouter()
  const [isSaving, startSaveTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Family photo state
  const [familyPhotoPreview, setFamilyPhotoPreview] = useState<string | null>(null)
  const [familyPendingBase64, setFamilyPendingBase64] = useState<string | null>(null)
  const [familyPendingMime, setFamilyPendingMime] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [familyPhotoError, setFamilyPhotoError] = useState<string | null>(null)
  const [familyPhotoUploading, setFamilyPhotoUploading] = useState(false)
  const [currentFamilyPhotoUrl, setCurrentFamilyPhotoUrl] = useState<string | null>(familyPhotoSignedUrl)
  const familyFileInputRef = useRef<HTMLInputElement>(null)

  const [localParents, setLocalParents] = useState<LocalParent[]>(
    initialParents.map(p => ({
      id: p.id,
      family_id: p.family_id,
      first_name: p.first_name,
      last_name: p.last_name ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      show_email: p.show_email,
      show_phone: p.show_phone,
      show_on_student_profile: p.show_on_student_profile,
      show_photo: p.show_photo,
      invite_email: p.invite_email ?? '',
      invite_sent_at: p.invite_sent_at,
      display_order: p.display_order,
      signedPhotoUrl: p.signedPhotoUrl,
    }))
  )

  const [form, setForm] = useState({
    family_display_name: family?.family_display_name ?? '',
    general_location: family?.general_location ?? '',
    family_bio: family?.family_bio ?? '',
    show_location: family?.show_location ?? true,
    open_to_carpool: family?.open_to_carpool ?? false,
    open_to_study_groups: family?.open_to_study_groups ?? false,
    open_to_social_meetups: family?.open_to_social_meetups ?? false,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleFamilyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleFamilyPhotoUpload() {
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

  async function handleFamilyPhotoRemove() {
    if (!family) return
    setFamilyPhotoError(null)
    const result = await removePhoto({ type: 'family', familyId: family.id })
    if (!result.success) { setFamilyPhotoError(result.error ?? 'Remove failed.'); return }
    setCurrentFamilyPhotoUrl(null)
    setFamilyPhotoPreview(null)
    setFamilyPendingBase64(null)
    if (familyFileInputRef.current) familyFileInputRef.current.value = ''
  }

  function handleSaveFamily(e: React.FormEvent) {
    e.preventDefault()
    if (!form.family_display_name.trim()) { setError('Family name is required.'); return }
    setError(null)
    startSaveTransition(async () => {
      const result = await upsertFamily(family?.id ?? null, form)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (!family) router.refresh()
    })
  }

  function handleAddParent() {
    if (!family) return
    setLocalParents(prev => [
      ...prev,
      {
        id: null,
        family_id: family.id,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        show_email: false,
        show_phone: false,
        show_on_student_profile: true,
        show_photo: true,
        invite_email: '',
        invite_sent_at: null,
        display_order: prev.length,
        signedPhotoUrl: null,
      },
    ])
  }

  function handleParentSaved(index: number, parentId: string) {
    setLocalParents(prev => prev.map((p, i) => i === index ? { ...p, id: parentId } : p))
  }

  function handleParentDeleted(index: number) {
    setLocalParents(prev => prev.filter((_, i) => i !== index))
  }

  function handleDeleteFamily() {
    if (!family) return
    startDeleteTransition(async () => {
      const result = await softDeleteFamily(family.id)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      router.push('/account/students')
    })
  }

  return (
    <div className="space-y-10">

      {/* ── Section A: Family info ── */}
      <section className="space-y-6">
        <h2 className="text-base font-semibold text-slate-900">Family info</h2>
        <form onSubmit={handleSaveFamily} className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="family_display_name">Family name *</Label>
            <Input id="family_display_name" value={form.family_display_name} onChange={e => set('family_display_name', e.target.value)} placeholder="Smith" required maxLength={100} />
            <p className="text-xs text-muted-foreground">
              Displayed as: <span className="font-medium text-slate-700">The {form.family_display_name.trim() || 'Smith'} Family</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_location">
              General area <span className="text-muted-foreground text-xs">(optional — neighborhood or city, not a street address)</span>
            </Label>
            <Input id="general_location" value={form.general_location} onChange={e => set('general_location', e.target.value)} placeholder="North Raleigh, Cary, Durham, etc." maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="family_bio">Family bio <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea id="family_bio" value={form.family_bio} onChange={e => set('family_bio', e.target.value)} placeholder="A short description of your family, interests, or anything you'd like others to know." rows={3} className="resize-none" maxLength={500} />
          </div>

          {/* Family photo — only available after family is created */}
          {family && (
            <div className="space-y-2">
              <Label>Family photo</Label>
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
                  {(familyPhotoPreview ?? currentFamilyPhotoUrl) ? (
                    <img
                      src={familyPhotoPreview ?? currentFamilyPhotoUrl!}
                      alt="Family"
                      className="h-full w-full object-cover object-top"
                    />
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
                      onChange={handleFamilyFileChange}
                    />
                    <label htmlFor="family-photo-input">
                      <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                        <span><Upload className="h-3 w-3" />{currentFamilyPhotoUrl ? 'Replace' : 'Upload'}</span>
                      </Button>
                    </label>
                    {familyPhotoPreview && (
                      <Button type="button" size="sm" onClick={handleFamilyPhotoUpload} disabled={familyPhotoUploading} className="gap-1">
                        {familyPhotoUploading ? 'Uploading…' : 'Save photo'}
                      </Button>
                    )}
                    {currentFamilyPhotoUrl && !familyPhotoPreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleFamilyPhotoRemove} className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <X className="h-3 w-3" />Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">JPG or PNG · max 5 MB</p>
                  {familyPhotoError && <p className="text-xs text-destructive">{familyPhotoError}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Visibility</p>
            <VisibilityToggle id="show_location" label="Show general area" description="Display your neighborhood or city on your profile." checked={form.show_location} onCheckedChange={v => set('show_location', v)} disabled={!form.general_location.trim()} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Open to</p>
            <VisibilityToggle id="open_to_carpool" label="Carpool" description="Let other families know you're open to carpooling." checked={form.open_to_carpool} onCheckedChange={v => set('open_to_carpool', v)} />
            <VisibilityToggle id="open_to_study_groups" label="Study groups" description="Show that you're open to forming study groups." checked={form.open_to_study_groups} onCheckedChange={v => set('open_to_study_groups', v)} />
            <VisibilityToggle id="open_to_social_meetups" label="Social meetups" description="Indicate you're interested in social gatherings." checked={form.open_to_social_meetups} onCheckedChange={v => set('open_to_social_meetups', v)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : family ? 'Save family info' : 'Create family profile'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/account/students')}>
              {family ? 'Done' : 'Cancel'}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </form>
      </section>

      {/* ── Section B: Parents ── */}
      {family && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Parents & guardians</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddParent} className="gap-1.5">
              <Plus className="h-4 w-4" />Add parent
            </Button>
          </div>

          {localParents.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              No parents added yet. Click "Add parent" to get started.
            </p>
          )}

          <div className="space-y-4">
            {localParents.map((parent, index) => (
              <ParentCard
                key={parent.id ?? `new-${index}`}
                parent={parent}
                onSaved={(parentId) => handleParentSaved(index, parentId)}
                onDeleted={() => handleParentDeleted(index)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section C: Student access ── */}
      {family && students.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Student access</h2>
            <p className="mt-0.5 text-sm text-slate-500">Invite your students so they can log in and view the directory.</p>
          </div>
          <div className="space-y-2">
            {students.map(student => (
              <StudentInviteRow key={student.id} student={student} />
            ))}
          </div>
        </section>
      )}

      {/* ── Danger zone ── */}
      {family && (
        <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">Danger zone</p>
          <p className="text-sm text-red-700">
            Deleting your family profile will remove it and all student profiles from the directory.
            You have 30 days to cancel before permanent deletion.
          </p>
          {!confirmDelete ? (
            <Button type="button" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => setConfirmDelete(true)}>
              Delete family profile
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-red-800">Are you sure?</p>
              <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" disabled={isDeleting} onClick={handleDeleteFamily}>
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          )}
        </section>
      )}

    </div>
  )
}
