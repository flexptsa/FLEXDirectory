'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VisibilityToggle } from '@/components/VisibilityToggle'
import { upsertStudent } from '@/lib/actions/student'
import { uploadPhotoBase64 } from '@/lib/actions/photo'
import { GRADES } from '@/types'
import type { DbStudent, DbPursuitTag, DbClubTag } from '@/types'

interface Props {
  student?: DbStudent | null
  familyId: string
  pursuitTags: DbPursuitTag[]
  clubTags: DbClubTag[]
  selectedClubIds?: string[]
  studentPhotoSignedUrl?: string | null
  redirectTo?: string
}

export function StudentForm({ student, familyId, pursuitTags, clubTags, selectedClubIds = [], studentPhotoSignedUrl, redirectTo = '/account/students' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhotoBase64, setPendingPhotoBase64] = useState<string | null>(null)
  const [pendingPhotoMime, setPendingPhotoMime] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)

  const hasExistingPhoto = !!studentPhotoSignedUrl

  const [form, setForm] = useState({
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    grade: student?.grade ?? '',
    primary_pursuit: student?.primary_pursuit ?? '',
    secondary_pursuit: student?.secondary_pursuit ?? '',
    organization: (student as any)?.organization ?? '',
    fun_facts: (student as any)?.fun_facts ?? '',
    is_listed_in_directory: student?.is_listed_in_directory ?? true,
    show_student_photo: student?.show_student_photo ?? hasExistingPhoto,
  })

  const [selectedClubs, setSelectedClubs] = useState<string[]>(selectedClubIds)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleClub(clubId: string) {
    setSelectedClubs(prev =>
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setPhotoError('Only JPG and PNG files are allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('File must be under 5 MB.'); return }
    fileRef.current = file
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
    if (!form.first_name.trim() || !form.grade || !form.primary_pursuit.trim()) {
      setError('First name, grade, and primary pursuit are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await upsertStudent(student?.id ?? null, familyId, {
        ...form,
        short_bio: '',
      }, selectedClubs)

      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }

      if (pendingPhotoBase64 && result.studentId) {
        const photoResult = await uploadPhotoBase64({
          base64: pendingPhotoBase64,
          mimeType: pendingPhotoMime,
          type: 'student',
          familyId,
          studentId: result.studentId,
        })
        if (!photoResult.success) { setError(`Profile saved, but photo upload failed: ${photoResult.error}`); return }
      }
      router.push(redirectTo)
    })
  }

  const displayPhoto = photoPreview ?? studentPhotoSignedUrl

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name *</Label>
          <Input id="first_name" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Emma" required maxLength={50} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="last_name" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" maxLength={50} />
        </div>
      </div>

      {/* Grade */}
      <div className="space-y-2">
        <Label htmlFor="grade">Grade *</Label>
        <Select value={form.grade} onValueChange={v => set('grade', v)}>
          <SelectTrigger id="grade" className="w-48"><SelectValue placeholder="Select grade" /></SelectTrigger>
          <SelectContent>
            {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pursuits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primary_pursuit">Primary pursuit *</Label>
          <Input id="primary_pursuit" list="pursuit-options" value={form.primary_pursuit} onChange={e => set('primary_pursuit', e.target.value)} placeholder="e.g. Dance, Baseball" required />
          <datalist id="pursuit-options">{pursuitTags.map(t => <option key={t.id} value={t.name} />)}</datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_pursuit">Secondary pursuit <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="secondary_pursuit" list="pursuit-options" value={form.secondary_pursuit} onChange={e => set('secondary_pursuit', e.target.value)} placeholder="e.g. Photography" />
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-2">
        <Label htmlFor="organization">Organization <span className="text-muted-foreground text-xs">(optional — team, gym, or group)</span></Label>
        <Input id="organization" value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="e.g. Triangle Rock Club, Durham Bulls" maxLength={100} />
      </div>

      {/* Clubs */}
      <div className="space-y-2">
        <Label>School clubs <span className="text-muted-foreground text-xs">(optional — select all that apply)</span></Label>
        <div className="flex flex-wrap gap-2">
          {clubTags.map(club => (
            <button
              key={club.id}
              type="button"
              onClick={() => toggleClub(club.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                selectedClubs.includes(club.id)
                  ? 'border-sky-500 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {club.name}
            </button>
          ))}
        </div>
      </div>

      {/* Fun facts */}
      <div className="space-y-2">
        <Label htmlFor="fun_facts">
          Fun facts <span className="text-muted-foreground text-xs">(optional — one per line, shown as bullet points)</span>
        </Label>
        <Textarea
          id="fun_facts"
          value={form.fun_facts}
          onChange={e => set('fun_facts', e.target.value)}
          placeholder={"Production Assistant with the Durham Bulls\nVolunteer at Catalyst Sports - Adaptive Climbing"}
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Photo */}
      <div className="space-y-3">
        <Label>Student photo</Label>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Student photo" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center"><Camera className="h-7 w-7 text-muted-foreground/40" /></div>
            )}
            {photoPreview && <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] text-white">New</div>}
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="sr-only" id="student-photo-input" onChange={handleFileChange} />
              <label htmlFor="student-photo-input">
                <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                  <span><Upload className="h-3 w-3" />{displayPhoto ? 'Replace' : 'Choose photo'}</span>
                </Button>
              </label>
              {photoPreview && <Button type="button" variant="ghost" size="sm" onClick={clearPendingPhoto} className="gap-1 text-muted-foreground"><X className="h-3 w-3" />Cancel</Button>}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>JPG or PNG · max 5 MB · will be resized to 800×800px</p>
              <p>Best results: square crop, good lighting, clear face</p>
            </div>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
            {photoPreview && <p className="text-xs text-primary font-medium">✓ Photo ready — will upload when you save</p>}
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Visibility</Label>
        <VisibilityToggle id="is_listed" label="Show in directory" description="When off, this student won't appear in the directory at all." checked={form.is_listed_in_directory} onCheckedChange={v => set('is_listed_in_directory', v)} />
        <VisibilityToggle
          id="show_photo"
          label="Show student photo"
          description={hasExistingPhoto || photoPreview ? 'Display this student\'s photo in the directory.' : 'Upload a photo to enable this.'}
          checked={form.show_student_photo}
          onCheckedChange={v => set('show_student_photo', v)}
          disabled={!hasExistingPhoto && !photoPreview}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : student ? 'Save changes' : 'Create student'}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(redirectTo)}>Cancel</Button>
      </div>
    </form>
  )
}
