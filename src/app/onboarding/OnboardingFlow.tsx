'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Check, ChevronDown, ChevronRight, Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { saveOnboardingFamily, saveOnboardingParents, saveOnboardingStudent } from '@/lib/actions/onboarding'
import { GRADES, type DbClubTag, type DbFamily, type DbParent, type DbPursuitTag } from '@/types'

type Step = 'welcome' | 'family' | 'parent' | 'student' | 'success'

type PhotoState = {
  preview: string | null
  base64: string | null
  mimeType: 'image/jpeg' | 'image/png'
}

type ParentForm = {
  first_name: string
  last_name: string
  email: string
  phone: string
  show_email: boolean
  show_phone: boolean
  photo: PhotoState
}

interface OnboardingStudent {
  id: string
  first_name: string
  last_name: string | null
  grade: string
  primary_pursuit: string
  student_photo_url: string | null
  show_student_photo: boolean
}

interface OnboardingFlowProps {
  userEmail: string
  initialStep: Step
  initialFamily: DbFamily | null
  initialParents: DbParent[]
  initialStudents: OnboardingStudent[]
  pursuitTags: DbPursuitTag[]
  clubTags: DbClubTag[]
  familyPhotoUrl: string | null
  parentPhotoUrls: Record<string, string | null>
  studentPhotoUrls: Record<string, string | null>
}

const emptyPhoto = (): PhotoState => ({ preview: null, base64: null, mimeType: 'image/jpeg' })

function getPhotoPayload(photo: PhotoState) {
  return photo.base64 ? { base64: photo.base64, mimeType: photo.mimeType } : null
}

function PhotoPicker({
  id,
  label,
  currentUrl,
  photo,
  onPhotoChange,
}: {
  id: string
  label: string
  currentUrl?: string | null
  photo: PhotoState
  onPhotoChange: (photo: PhotoState) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const displayUrl = photo.preview ?? currentUrl

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
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      onPhotoChange({
        preview: dataUrl,
        base64: dataUrl.split(',')[1],
        mimeType: file.type as 'image/jpeg' | 'image/png',
      })
    }
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    onPhotoChange(emptyPhoto())
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-100">
          {displayUrl ? (
            <img src={displayUrl} alt={label} className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-6 w-6 text-slate-300" />
            </div>
          )}
          {photo.preview && (
            <div className="absolute inset-x-0 bottom-0 bg-[#002554]/85 py-0.5 text-center text-[10px] font-medium text-white">
              New
            </div>
          )}
        </div>
        <div className="space-y-2 pt-1">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <label htmlFor={id}>
              <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer gap-1">
                <span>
                  <Upload className="h-3.5 w-3.5" />
                  {displayUrl ? 'Replace' : 'Upload'}
                </span>
              </Button>
            </label>
            {photo.preview && (
              <Button type="button" variant="ghost" size="sm" onClick={clearPhoto} className="gap-1 text-slate-500">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">JPG or PNG, max 5 MB.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

function PrivacyToggle({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-700">
        {label}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

function StepShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#CB9700]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#002554] sm:text-4xl">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  )
}

export function OnboardingFlow({
  userEmail,
  initialStep,
  initialFamily,
  initialParents,
  initialStudents,
  pursuitTags,
  clubTags,
  familyPhotoUrl,
  parentPhotoUrls,
  studentPhotoUrls,
}: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(initialStep)
  const [familyId, setFamilyId] = useState(initialFamily?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const primaryParent = initialParents[0] ?? null
  const secondaryParent = initialParents[1] ?? null

  const [family, setFamily] = useState({
    family_display_name: initialFamily?.family_display_name ?? '',
    photo: emptyPhoto(),
  })
  const [primary, setPrimary] = useState<ParentForm>({
    first_name: primaryParent?.first_name ?? '',
    last_name: primaryParent?.last_name ?? '',
    email: primaryParent?.email ?? userEmail,
    phone: primaryParent?.phone ?? '',
    show_email: primaryParent?.show_email ?? false,
    show_phone: primaryParent?.show_phone ?? false,
    photo: emptyPhoto(),
  })
  const [showSecondParent, setShowSecondParent] = useState(!!secondaryParent)
  const [secondary, setSecondary] = useState<ParentForm>({
    first_name: secondaryParent?.first_name ?? '',
    last_name: secondaryParent?.last_name ?? '',
    email: secondaryParent?.email ?? '',
    phone: secondaryParent?.phone ?? '',
    show_email: secondaryParent?.show_email ?? false,
    show_phone: secondaryParent?.show_phone ?? false,
    photo: emptyPhoto(),
  })
  const [student, setStudent] = useState({
    first_name: '',
    last_name: '',
    grade: '',
    pursuit: '',
    clubIds: [] as string[],
    photo: emptyPhoto(),
  })

  function setParentField<K extends keyof ParentForm>(
    setter: React.Dispatch<React.SetStateAction<ParentForm>>,
    key: K,
    value: ParentForm[K]
  ) {
    setter((current) => ({ ...current, [key]: value }))
  }

  function resetStudent() {
    setStudent({
      first_name: '',
      last_name: '',
      grade: '',
      pursuit: '',
      clubIds: [],
      photo: emptyPhoto(),
    })
  }

  function toggleClub(clubId: string) {
    setStudent((current) => ({
      ...current,
      clubIds: current.clubIds.includes(clubId)
        ? current.clubIds.filter((id) => id !== clubId)
        : [...current.clubIds, clubId],
    }))
  }

  function handleFamilySubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingFamily({
        family_display_name: family.family_display_name,
        photo: getPhotoPayload(family.photo),
      })
      if (!result.success || !result.familyId) {
        setError(result.error ?? 'Could not save your family.')
        return
      }
      setFamilyId(result.familyId)
      setStep('parent')
      router.refresh()
    })
  }

  function handleParentSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!familyId) {
      setError('Save your family first.')
      return
    }
    startTransition(async () => {
      const result = await saveOnboardingParents({
        familyId,
        primary: {
          ...primary,
          photo: getPhotoPayload(primary.photo),
        },
        secondary: showSecondParent
          ? {
              ...secondary,
              photo: getPhotoPayload(secondary.photo),
            }
          : null,
      })
      if (!result.success) {
        setError(result.error ?? 'Could not save parent details.')
        return
      }
      setStep('student')
      router.refresh()
    })
  }

  function handleStudentSubmit(e: React.FormEvent, addAnother: boolean) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!familyId) {
      setError('Save your family first.')
      return
    }
    startTransition(async () => {
      const result = await saveOnboardingStudent({
        familyId,
        student: {
          ...student,
          photo: getPhotoPayload(student.photo),
        },
      })
      if (!result.success) {
        setError(result.error ?? 'Could not save student details.')
        return
      }
      if (addAnother) {
        resetStudent()
        setNotice('Student saved. Add another student when you are ready.')
        router.push('/onboarding?step=student')
        router.refresh()
        return
      }
      router.push('/onboarding?success=1')
      setStep('success')
      router.refresh()
    })
  }

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const previewFamilyName = family.family_display_name || initialFamily?.family_display_name || ''
  const previewFamilyAvatarUrl = family.photo.preview ?? familyPhotoUrl

  const previewParents = [
    primary.first_name ? {
      name: `${primary.first_name}${primary.last_name ? ' ' + primary.last_name : ''}`,
      photoUrl: primary.photo.preview ?? (primaryParent ? parentPhotoUrls[primaryParent.id] : null),
    } : null,
    showSecondParent && secondary.first_name ? {
      name: `${secondary.first_name}${secondary.last_name ? ' ' + secondary.last_name : ''}`,
      photoUrl: secondary.photo.preview ?? (secondaryParent ? parentPhotoUrls[secondaryParent.id] : null),
    } : null,
  ].filter((p): p is { name: string; photoUrl: string | null } => p !== null)

  const previewParentNames = previewParents.map(p => p.name).join(' & ')

  const savedPreviewStudents = initialStudents.map(s => ({
    id: s.id,
    name: `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`,
    pursuit: s.primary_pursuit,
    grade: s.grade,
    photoUrl: s.show_student_photo ? studentPhotoUrls[s.id] : null,
  }))

  const currentStudentAlreadySaved = !student.first_name || initialStudents.some(
    s => s.first_name === student.first_name && (s.last_name ?? '') === (student.last_name ?? '')
  )

  const previewStudents = [
    ...savedPreviewStudents,
    !currentStudentAlreadySaved ? {
      id: 'current',
      name: `${student.first_name}${student.last_name ? ' ' + student.last_name : ''}`,
      pursuit: student.pursuit,
      grade: student.grade,
      photoUrl: student.photo.preview ?? null,
    } : null,
  ].filter((s): s is { id: string; name: string; pursuit: string; grade: string; photoUrl: string | null } => s !== null)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <img
          src="/images/PTSA-Logo-Transparent.png"
          alt="Crossroads FLEX PTSA"
          className="h-12 w-auto"
        />
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-slate-400 sm:block">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-[#002554]"
          >
            Sign out
          </button>
        </div>
      </div>

      {step === 'welcome' && (
        <StepShell eyebrow="Step 1 of 5" title="Welcome to the FLEX Family Directory">
          <div className="space-y-6">
            <p className="text-lg leading-7 text-slate-600">
              Let&apos;s get your family set up so others can find you.
            </p>
            <ul className="space-y-3 text-slate-700">
              {['Add your family', 'Add parent details', 'Add student details', 'Takes about 2 minutes'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#002554] text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button type="button" onClick={() => setStep('family')} className="rounded-lg bg-[#002554] px-6 hover:bg-[#003a7a]">
              Get Started
            </Button>
          </div>
        </StepShell>
      )}

      {step === 'family' && (
        <StepShell eyebrow="Step 2 of 5" title="Add Your Family">
          <form onSubmit={handleFamilySubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="family_display_name">Family name *</Label>
              <Input
                id="family_display_name"
                value={family.family_display_name}
                onChange={(e) => setFamily((current) => ({ ...current, family_display_name: e.target.value }))}
                placeholder="Smith"
                required
                maxLength={100}
              />
              <p className="text-xs text-slate-500">
                Displayed as The {family.family_display_name.trim() || 'Smith'} Family.
              </p>
            </div>

            <PhotoPicker
              id="family-photo"
              label="Family photo (optional)"
              currentUrl={familyPhotoUrl}
              photo={family.photo}
              onPhotoChange={(photo) => setFamily((current) => ({ ...current, photo }))}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={isPending} className="rounded-lg bg-[#002554] hover:bg-[#003a7a]">
              {isPending ? 'Saving...' : 'Next: Add Parent Details'}
            </Button>
          </form>
        </StepShell>
      )}

      {step === 'parent' && (
        <StepShell eyebrow="Step 3 of 5" title="Add Parent Details">
          <form onSubmit={handleParentSubmit} className="space-y-7">
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_first_name">First name *</Label>
                  <Input
                    id="primary_first_name"
                    value={primary.first_name}
                    onChange={(e) => setParentField(setPrimary, 'first_name', e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_last_name">Last name</Label>
                  <Input
                    id="primary_last_name"
                    value={primary.last_name}
                    onChange={(e) => setParentField(setPrimary, 'last_name', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_email">Email</Label>
                  <Input id="primary_email" type="email" value={primary.email} readOnly className="bg-slate-50 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_phone">Phone (optional)</Label>
                  <Input
                    id="primary_phone"
                    type="tel"
                    value={primary.phone}
                    onChange={(e) => setParentField(setPrimary, 'phone', e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              <PhotoPicker
                id="primary-photo"
                label="Parent photo (optional)"
                currentUrl={primaryParent ? parentPhotoUrls[primaryParent.id] : null}
                photo={primary.photo}
                onPhotoChange={(photo) => setParentField(setPrimary, 'photo', photo)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <PrivacyToggle
                  id="primary_show_email"
                  label="Show email"
                  checked={primary.show_email}
                  disabled={!primary.email.trim()}
                  onChange={(checked) => setParentField(setPrimary, 'show_email', checked)}
                />
                <PrivacyToggle
                  id="primary_show_phone"
                  label="Show phone"
                  checked={primary.show_phone}
                  disabled={!primary.phone.trim()}
                  onChange={(checked) => setParentField(setPrimary, 'show_phone', checked)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowSecondParent((open) => !open)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <div>
                  <p className="font-semibold text-slate-900">Second parent or guardian</p>
                  <p className="text-sm text-slate-500">Optional. You can skip this and add someone later.</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${showSecondParent ? 'rotate-180' : ''}`} />
              </button>

              {showSecondParent && (
                <div className="space-y-5 border-t border-slate-200 px-4 py-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="secondary_first_name">First name</Label>
                      <Input
                        id="secondary_first_name"
                        value={secondary.first_name}
                        onChange={(e) => setParentField(setSecondary, 'first_name', e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary_last_name">Last name</Label>
                      <Input
                        id="secondary_last_name"
                        value={secondary.last_name}
                        onChange={(e) => setParentField(setSecondary, 'last_name', e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="secondary_email">Email (optional)</Label>
                      <Input
                        id="secondary_email"
                        type="email"
                        value={secondary.email}
                        onChange={(e) => setParentField(setSecondary, 'email', e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary_phone">Phone (optional)</Label>
                      <Input
                        id="secondary_phone"
                        type="tel"
                        value={secondary.phone}
                        onChange={(e) => setParentField(setSecondary, 'phone', e.target.value)}
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <PhotoPicker
                    id="secondary-photo"
                    label="Second parent photo (optional)"
                    currentUrl={secondaryParent ? parentPhotoUrls[secondaryParent.id] : null}
                    photo={secondary.photo}
                    onPhotoChange={(photo) => setParentField(setSecondary, 'photo', photo)}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PrivacyToggle
                      id="secondary_show_email"
                      label="Show email"
                      checked={secondary.show_email}
                      disabled={!secondary.email.trim()}
                      onChange={(checked) => setParentField(setSecondary, 'show_email', checked)}
                    />
                    <PrivacyToggle
                      id="secondary_show_phone"
                      label="Show phone"
                      checked={secondary.show_phone}
                      disabled={!secondary.phone.trim()}
                      onChange={(checked) => setParentField(setSecondary, 'show_phone', checked)}
                    />
                  </div>
                </div>
              )}
            </section>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={isPending} className="rounded-lg bg-[#002554] hover:bg-[#003a7a]">
              {isPending ? 'Saving...' : 'Next: Add Student Details'}
            </Button>
          </form>
        </StepShell>
      )}

      {step === 'student' && (
        <StepShell eyebrow="Step 4 of 5" title="Add Student Details">
          <form className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student_first_name">First name *</Label>
                <Input
                  id="student_first_name"
                  value={student.first_name}
                  onChange={(e) => setStudent((current) => ({ ...current, first_name: e.target.value }))}
                  required
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_last_name">Last name</Label>
                <Input
                  id="student_last_name"
                  value={student.last_name}
                  onChange={(e) => setStudent((current) => ({ ...current, last_name: e.target.value }))}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student_grade">Grade *</Label>
                <Select value={student.grade} onValueChange={(grade) => setStudent((current) => ({ ...current, grade }))}>
                  <SelectTrigger id="student_grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_pursuit">Pursuit *</Label>
                <Input
                  id="student_pursuit"
                  list="onboarding-pursuits"
                  value={student.pursuit}
                  onChange={(e) => setStudent((current) => ({ ...current, pursuit: e.target.value }))}
                  placeholder="Dance, baseball, coding"
                  required
                  maxLength={100}
                />
                <datalist id="onboarding-pursuits">
                  {pursuitTags.map((tag) => (
                    <option key={tag.id} value={tag.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {clubTags.length > 0 && (
              <div className="space-y-2">
                <Label>Clubs (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {clubTags.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => toggleClub(club.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        student.clubIds.includes(club.id)
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {club.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <PhotoPicker
              id="student-photo"
              label="Student photo (optional)"
              photo={student.photo}
              onPhotoChange={(photo) => setStudent((current) => ({ ...current, photo }))}
            />

            {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={isPending}
                onClick={(e) => handleStudentSubmit(e, false)}
                className="rounded-lg bg-[#002554] hover:bg-[#003a7a]"
              >
                {isPending ? 'Saving...' : 'Finish & View Directory'}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                variant="outline"
                onClick={(e) => handleStudentSubmit(e, true)}
                className="gap-1 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Save & Add Another Student
              </Button>
            </div>
          </form>
        </StepShell>
      )}

      {step === 'success' && (
        <StepShell eyebrow="Step 5 of 5" title="You're live in the directory!">
          <div className="space-y-6">
            <p className="text-lg leading-7 text-slate-600">This is how other FLEX families will see you.</p>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-28 bg-gradient-to-r from-[#002554] to-[#003a7a] sm:h-36" />

              <div className="px-5 pb-8 sm:px-8 sm:pb-10">
                <div className="-mt-14 flex flex-col items-center text-center sm:-mt-16">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 ring-2 ring-[#CB9700] shadow-md sm:h-36 sm:w-36">
                    {previewFamilyAvatarUrl ? (
                      <img src={previewFamilyAvatarUrl} alt={previewFamilyName} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg className="h-14 w-14 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1">
                    <h2 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                      The {previewFamilyName} Family
                    </h2>
                    {previewParentNames && (
                      <p className="text-lg text-slate-500">{previewParentNames}</p>
                    )}
                  </div>
                </div>

                {(previewParents.length > 0 || previewStudents.length > 0) && (
                  <div className="mt-8 grid gap-4 lg:grid-cols-2">
                    {previewParents.length > 0 && (
                      <section className="rounded-2xl bg-slate-50 p-4">
                        <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]">
                          <span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                          Parents &amp; Guardians
                        </h2>
                        <div className="mt-4 space-y-3">
                          {previewParents.map((parent, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                {parent.photoUrl ? (
                                  <img src={parent.photoUrl} alt={parent.name} className="h-full w-full object-cover object-top" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <svg className="h-6 w-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900">{parent.name}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {previewStudents.length > 0 && (
                      <section className="rounded-2xl bg-slate-50 p-4">
                        <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]">
                          <span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                          Students
                        </h2>
                        <div className="mt-4 space-y-3">
                          {previewStudents.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover object-top" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <svg className="h-6 w-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900">{s.name}</p>
                                <p className="text-sm text-slate-500">
                                  <span className="text-[#002554]">{s.pursuit}</span>
                                  {s.grade && <span className="text-slate-400"> · </span>}
                                  {s.grade && <span className="text-[#A67C00]">{s.grade} Grade</span>}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-lg bg-[#002554] hover:bg-[#003a7a]">
                <Link href="/directory">Go to Directory</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/account/profile/family">Edit Profile</Link>
              </Button>
            </div>
          </div>
        </StepShell>
      )}
    </main>
  )
}
