# FLEX Directory — Developer Reference

A technical and functional reference for developers working on this codebase. Based on code as of April 2026.

---

## 1. Purpose and Scope

FLEX Directory is a **private, invite-gated family directory** for Crossroads FLEX PTSA — a homeschool enrichment program. It lets approved families browse students, parents, and family profiles and reach out to each other.

**What it does:**
- Student directory with photo cards, search, and detail pages
- Parent and family browse pages
- Profile management (family, parents, students) with per-field privacy controls
- Contact form that delivers messages to families without exposing email addresses
- Admin tools: access-request approval, student photo moderation, user role management, pre-approved email list

**What it does NOT do:**
- Public access — the entire app except `/` and `/auth` requires an approved account
- Email notifications to families are handled by a separate Supabase Edge Function (`send-contact-message`), not by Next.js
- No payment, scheduling, or event management
- No dark mode UI (CSS vars for it exist in globals.css but are unused in practice)

---

## 2. Tech Stack and Key Architectural Decisions

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth + DB + Storage | Supabase (PostgreSQL, GoTrue auth, S3-compatible storage) |
| Supabase client | `@supabase/ssr` — separate browser/server/middleware clients |
| Styling | Tailwind CSS v3 + shadcn/ui primitives (Radix UI) |
| Image processing | `sharp` (server-side resize on upload, runs in Node.js) |
| Icons | lucide-react |
| Deployment | Vercel (assumed — no config file present, but Next.js + Supabase is the standard pairing) |

**Key decisions:**

- **All mutations are Next.js Server Actions** (`'use server'`). There is no separate API layer. Actions live in `src/lib/actions/`.
- **All data fetching is in Server Components.** No SWR, React Query, or client-side fetching except for the auth pages themselves.
- **Row-level ownership is enforced in server actions**, not solely relying on Supabase RLS. Every mutating action verifies `family.owner_user_id === user.id` before writing.
- **Photos are stored in Supabase Storage** (`flex-photos` bucket) as private objects. All photo URLs in the DB are storage paths (e.g. `student-photos/{familyId}/{studentId}.jpg`), never public URLs. Signed URLs with 1-hour expiry are generated server-side on every page render via `getSignedUrl()`.
- **Student photos go through admin moderation.** Parent and family photos do not. (See bug note in §12.)
- **`robots: noindex, nofollow`** is set on the root layout — the app is intentionally not indexed.
- **No ORM.** Direct Supabase PostgREST calls everywhere.

---

## 3. Database Schema

All tables are in the `public` schema. Types are in `src/types/index.ts`.

### `users`
Mirrors Supabase `auth.users`. Created by a DB trigger on sign-up (with a fallback upsert in the callback route).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Matches `auth.users.id` |
| `email` | text | |
| `full_name` | text | From OAuth metadata |
| `role` | text | `pending \| parent \| member \| moderator \| super_admin` |
| `is_approved` | bool | Gates directory access |
| `created_at` | timestamptz | |
| `last_login_at` | timestamptz | |

### `families`
One family per user account (the owner). A family can have multiple parents and students.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_user_id` | uuid FK → `users.id` | The logged-in user who manages this family |
| `family_display_name` | text | Used as "The {name} Family" |
| `general_location` | text | Neighborhood/area, not an address |
| `family_bio` | text | Newline-separated "fun facts" |
| `show_location` | bool | |
| `open_to_carpool` | bool | |
| `open_to_study_groups` | bool | |
| `open_to_social_meetups` | bool | |
| `photo_url` | text | Storage path in `flex-photos` bucket |
| `deleted_at` | timestamptz | Soft-delete timestamp |
| `purge_after` | timestamptz | 30 days after `deleted_at` — hard delete date |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `parents`
Multiple parents per family, ordered by `display_order`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `family_id` | uuid FK → `families.id` | |
| `first_name` | text | |
| `last_name` | text | |
| `photo_url` | text | Storage path |
| `email` | text | Not shown unless `show_email = true` |
| `phone` | text | Not shown unless `show_phone = true` |
| `show_email` | bool | |
| `show_phone` | bool | |
| `show_on_student_profile` | bool | Whether this parent appears on student detail pages |
| `show_photo` | bool | |
| `invite_email` | text | Email to send a family invite to |
| `invite_sent_at` | timestamptz | |
| `display_order` | int | Sort order within family |
| `created_at` / `updated_at` | timestamptz | |

### `students`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `family_id` | uuid FK → `families.id` | |
| `first_name` | text | |
| `last_name` | text | |
| `grade` | text | `9th \| 10th \| 11th \| 12th` |
| `primary_pursuit` | text | Main academic/activity focus |
| `secondary_pursuit` | text | Optional |
| `short_bio` | text | (field exists in type; not shown prominently in UI) |
| `organization` | text | e.g. "Crossroads FLEX" |
| `fun_facts` | text | Newline-separated |
| `student_photo_url` | text | Storage path |
| `student_photo_status` | text | `none \| pending \| approved \| hidden` |
| `is_listed_in_directory` | bool | Whether the student appears in public directory |
| `show_student_photo` | bool | Whether approved photo is displayed |
| `invite_email` | text | |
| `invite_sent_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

### `club_tags`
Lookup table for club names.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text |

### `student_clubs`
Many-to-many join between students and club tags.

| Column | Type |
|---|---|
| `student_id` | uuid FK → `students.id` |
| `club_tag_id` | uuid FK → `club_tags.id` |

### `access_requests`
Created when an unrecognized user signs in. Admins review these.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `users.id` | Unique — one request per user |
| `requested_at` | timestamptz | |
| `status` | text | `pending \| approved \| rejected` |
| `reviewed_by` | uuid FK → `users.id` | |
| `reviewed_at` | timestamptz | |
| `rejection_reason` | text | |

### `approved_emails`
Pre-approved emails added by admins. Users matching these get instant `parent` role on first sign-in.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | Unique, lowercased |
| `added_by` | uuid FK → `users.id` | |
| `added_at` | timestamptz | |
| `claimed_at` | timestamptz | Set when the email is used |
| `claimed_by_user_id` | uuid FK → `users.id` | |

### `contact_messages`
Stores every contact message sent between members.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `sender_user_id` | uuid FK → `users.id` |
| `recipient_family_id` | uuid FK → `families.id` |
| `message_body` | text |
| `sent_at` | timestamptz |
| `delivered` | bool |

### `photo_moderation_log`
Audit log of admin photo decisions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `family_id` | uuid | |
| `student_id` | uuid | |
| `photo_type` | text | `parent \| student` |
| `photo_url` | text | Storage path at time of review |
| `action` | text | `approved \| hidden \| removed` |
| `admin_note` | text | |
| `reviewed_by_user_id` | uuid | |
| `reviewed_at` | timestamptz | |

---

## 4. Row-Level Security Approach

RLS is configured in Supabase (not visible in this repo's source). The app uses **two trust levels**:

1. **Anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — used for all normal user operations. RLS policies are expected to allow approved users to read directory data and write only their own records.
2. **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) — used in server-side code where RLS would block the operation:
   - Reading/writing `approved_emails` (RLS blocks anon reads on this table)
   - Approving/rejecting access requests
   - Sending Supabase auth invites via `adminClient.auth.admin.generateLink()`
   - Sending contact notification emails via the Edge Function

**In-code ownership checks** (defense-in-depth on top of RLS):
- Every family mutation verifies `family.owner_user_id === user.id`
- Every parent/student mutation fetches the parent's `family_id` first, then verifies ownership
- Admin actions call `requireAdmin()` which checks the user's role from `public.users`

The `approved_emails` table requires the service role to read — confirmed by console.log in the callback route and the use of `serviceClient` there.

---

## 5. Auth Flow

### Sign-in

Two methods, both on `/auth`:
- **Magic link** — `supabase.auth.signInWithOtp({ email, emailRedirectTo: '/auth/callback' })`
- **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`

### Callback (`/auth/callback/route.ts`)

1. Exchange code for session via `supabase.auth.exchangeCodeForSession(code)`
2. Upsert user into `public.users` with `role: 'pending', is_approved: false` (fallback if DB trigger didn't fire)
3. **Invited user path** — Check if user's email matches `invite_email` on any `parents` or `students` row. If yes → set `role: 'member', is_approved: true` → redirect to `/directory`
4. **Pre-approved email path** — Check `approved_emails` table (via service role). If found → set `role: 'parent', is_approved: true`, mark email as claimed → redirect to `/directory`
5. **Already approved** — Check `users.is_approved`. If true → redirect to `/directory`
6. **Unknown user** — Upsert an `access_requests` row, redirect to `/auth/waiting`

### Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`)

Runs on every request (except static files and images). Calls `supabase.auth.getUser()` to refresh the session. Route logic:
- Unauthenticated + protected route → redirect to `/auth`
- Authenticated + `/auth` (not callback/waiting) → redirect to `/directory`

The middleware only checks **authentication** (is there a session?), not **approval** (is the user approved?).

### Layout-level approval gating

Each protected section has a layout that checks `is_approved`:
- `src/app/directory/layout.tsx` — redirects unapproved users to `/auth/waiting`
- `src/app/account/layout.tsx` — same
- `src/app/admin/layout.tsx` — additionally checks `role` is `moderator` or `super_admin`; redirects others to `/directory`

### Roles

| Role | Who | Access |
|---|---|---|
| `pending` | Just signed up, no match on invite/approved lists | None — stuck at `/auth/waiting` |
| `parent` | Approved via email list or manual admin approval | Full directory + own profile |
| `member` | Invited via parent/student `invite_email` field | Full directory + own profile |
| `moderator` | Admin-assigned | + Admin panel (photo moderation, access requests) |
| `super_admin` | Admin-assigned | + User management, approved emails, role changes |

Note: `parent` and `member` have the same practical access level in the UI. The distinction exists in the DB but isn't enforced differently in code.

### Sign-out

Client-side: `supabase.auth.signOut()` then `window.location.href = '/'`. No server-side signout route (one was removed per git history).

---

## 6. Routes

### Public

| Route | Description |
|---|---|
| `/` | Landing page — logo + "Sign in or request access" link |
| `/auth` | Sign-in page — magic link + Google OAuth |
| `/auth/callback` | OAuth/magic link exchange route (GET handler) |
| `/auth/waiting` | Shown to unapproved users after sign-in |

### Directory (requires `is_approved = true`)

| Route | Description |
|---|---|
| `/directory` | Hub page — greeting, stats, nav cards to Students/Parents/Families |
| `/directory/students` | Searchable student card grid. Query params: `q`, `grade`, `pursuit`, `club`, `sort` |
| `/directory/students/[id]` | Student detail: photo, grade, pursuit, clubs, organization, fun facts, family members, contact form |
| `/directory/parents` | Parent card grid. Links to family profile. Query param: `q` |
| `/directory/families` | Family list with avatar, parent names, student chips, contact button |
| `/directory/families/[id]` | Family detail: parents (with contact info), listed students, fun facts |

**Leftover routes (should be cleaned up):**
- `/directory/original` — appears to be a legacy/prototype page
- `/directory/test` — dev test page

### Account / Profile (requires `is_approved = true`)

`/account/students` redirects to `/account/profile/students`.

Onboarding/editing flow under `/account/profile/` has a tab nav with three steps:

| Route | Description |
|---|---|
| `/account/profile/family` | Family name, location, fun facts, carpool/study/meetup toggles, family photo upload |
| `/account/profile/parents` | List parents, link to add/edit |
| `/account/profile/parents/new` | Add a new parent |
| `/account/profile/parents/[id]` | Edit parent (name, contact, privacy toggles, photo, invite) |
| `/account/profile/students` | List students, link to add/edit |
| `/account/profile/students/new` | Add a new student |
| `/account/profile/students/[id]` | Edit student (name, grade, pursuit, clubs, photo, listing toggle) |
| `/account/profile/review` | Read-only preview of how the family profile appears to others |

**Legacy/duplicate routes (may be unused):**
- `/account/family/edit` — contains `FamilyForm.tsx`, appears to be an older version of the family edit flow
- `/account/students/[id]/edit` — contains `StudentForm.tsx`, appears to be an older version of student editing

### Admin (requires `role = moderator | super_admin`)

| Route | Description |
|---|---|
| `/admin` | Dashboard with links to sub-sections |
| `/admin/requests` | List pending + reviewed access requests; approve/reject buttons |
| `/admin/photos` | Grid of student photos with `status = 'pending'`; approve/hide buttons |
| `/admin/users` | Full user list with role selector and revoke access; `super_admin` only |
| `/admin/approved-emails` | Add/delete pre-approved email addresses |

---

## 7. Key Components and Patterns

### `AppNav` / `AppNavClient` split

`AppNav` (`src/components/AppNav.tsx`) is an async Server Component. It fetches the user's role from Supabase and passes `isAdmin: boolean` and `email` down to `AppNavClient`.

`AppNavClient` (`src/components/AppNavClient.tsx`) is `'use client'` and handles the mobile hamburger toggle state and the `handleSignOut` function. This is the standard RSC pattern for nav: data fetching in the server, interactivity in the client.

### `PhotoUpload`

`src/components/PhotoUpload.tsx` — client component. Flow:
1. User picks a file (JPG/PNG, ≤5 MB)
2. File is previewed via `FileReader` locally
3. On "Save photo", file is re-read as base64 and passed to `uploadPhotoBase64()` server action
4. Server action decodes base64 → resizes with `sharp` to max 800×800 → uploads to `flex-photos` bucket → updates DB record
5. On success, `onComplete()` callback fires (usually nothing, page revalidation handles the refresh)

Used for both parent photos (no moderation) and student photos (should go through moderation — see §12 bug).

### Student card grid

`StudentCard` (`src/components/StudentCard.tsx`) renders a portrait card with photo, first name, last name, pursuit, and grade. In development, falls back to `randomuser.me` placeholder portraits when no photo is available. In production, shows an initial letter avatar.

The grid uses `grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`.

### `ContactForm`

`src/components/ContactForm.tsx` — client component. Renders a trigger button that opens a Radix `Dialog`. On submit, calls `sendContactMessage()` server action which:
1. Validates the message (non-empty, ≤1000 chars)
2. Inserts a row in `contact_messages`
3. Fire-and-forgets a POST to the Supabase Edge Function `send-contact-message` if the family has a `public_email` with `show_email = true`

The UI never shows success/failure of the email delivery — only whether the DB insert succeeded.

### `SoftDeleteBanner`

`src/components/SoftDeleteBanner.tsx` — shown when a family has `deleted_at` set. Displays the purge date and an "Cancel deletion" button that calls `cancelFamilyDeletion()`.

### Server Action pattern

All actions follow this structure:
```ts
'use server'

async function requireXxx() {
  // auth check → return { error, supabase, user }
}

export async function doSomething(id: string): Promise<ActionResult> {
  const { error, supabase, user } = await requireXxx()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }
  // ... ownership check ...
  // ... DB operation ...
  revalidatePath('/relevant/path')
  return { success: true }
}
```

`ActionResult` is `{ success: boolean; error?: string }` from `src/types/index.ts`.

### Supabase clients

| Client | File | Usage |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` | `'use client'` components — auth pages, sign-out |
| Server | `src/lib/supabase/server.ts` (`createClient`) | Server components and actions — normal user operations |
| Server (service) | `src/lib/supabase/server.ts` (`createServiceClient`) | Exported but not used in app code — bypasses RLS |
| Middleware | `src/lib/supabase/middleware.ts` | Session refresh only |
| Inline admin | `createClient as createAdminClient` from `@supabase/supabase-js` | Used inline in `callback/route.ts` and `actions/family.ts` for operations needing service role |

Note: `createServiceClient` is exported from `server.ts` but nowhere imported. The service role client is instead constructed inline in the places that need it.

---

## 8. User Workflows

### Onboarding (first-time approved user)

1. Sign in → callback approves them → land on `/directory`
2. Nav → "My Profile" → `/account/profile/students` → redirected to `/account/profile/family` (no family yet)
3. Fill out family name, location, fun facts, carpool preferences → save
4. Add parents/guardians (name, contact info, privacy settings, optional photo)
5. Add students (name, grade, pursuit, clubs, optional photo)
6. Review page shows how the profile looks to others

### Profile editing (returning user)

Same routes. Each form pre-fills from the DB. Saves call the relevant server action, which calls `revalidatePath`.

### Student photo upload

1. User goes to student edit page
2. `PhotoUpload` component is rendered with `type="student"`
3. User selects image → previews locally
4. Clicks "Save photo" → base64 sent to `uploadPhotoBase64` server action
5. Server resizes, uploads to `flex-photos/student-photos/{familyId}/{studentId}.jpg`
6. **BUG: sets `student_photo_status` to `'approved'` directly** — see §12
7. Photo appears in directory immediately

### Contacting a family

1. On any student or family page, click "Contact this family"
2. A dialog appears with a textarea (≤1000 chars)
3. Submit → server action inserts `contact_messages` row and calls Edge Function if family has a public email
4. Family receives an email (if configured); message is stored regardless

### Admin: Approving access

1. New user signs in → access request created in DB
2. Admin navigates to `/admin/requests`
3. Clicks Approve → `approveAccessRequest()` sets `access_requests.status = 'approved'`, sets `users.is_approved = true, role = 'parent'`
4. User can now access the directory

### Admin: Photo moderation

1. Navigate to `/admin/photos`
2. Students with `student_photo_status = 'pending'` are shown with their signed photo URL
3. Click Approve → `approveStudentPhoto()` sets status to `'approved'`, logs to `photo_moderation_log`
4. Click Hide → `hidePhoto()` sets status to `'hidden'`, sets `show_student_photo = false`

### Family soft-delete

1. Family owner triggers deletion (UI location unclear — `softDeleteFamily()` action exists)
2. `deleted_at` and `purge_after` (30 days out) are set
3. Family is excluded from all directory queries (`is('deleted_at', null)`)
4. Banner shown to family owner with cancel button
5. Hard delete must be done manually or via a scheduled function (no purge logic visible in this codebase)

### Pre-approving emails (admin)

1. Admin goes to `/admin/approved-emails`
2. Pastes email addresses (one per line or CSV)
3. `addApprovedEmails()` upserts them into `approved_emails`
4. When any of those users sign in, they bypass the access-request queue and get `role: 'parent'` automatically

### Inviting a family member

1. In parent or student edit form, enter an email in the "Invite" field
2. `sendFamilyInvite()` stores the email on the record, then calls `adminClient.auth.admin.generateLink({ type: 'invite' })`
3. Supabase sends an invite email with a link to `/auth/callback`
4. On callback, the email is matched against `parents.invite_email` or `students.invite_email` → user is auto-approved as `member`

---

## 9. File Structure

```
src/
├── app/
│   ├── layout.tsx                     # Root layout (Inter font, metadata, robots: noindex)
│   ├── page.tsx                       # Landing page
│   ├── globals.css                    # Tailwind base + CSS custom properties (shadcn tokens)
│   │
│   ├── auth/
│   │   ├── page.tsx                   # Sign-in (magic link + Google OAuth)
│   │   ├── waiting/page.tsx           # Pending approval holding page
│   │   └── callback/route.ts          # OAuth/magic link exchange + access logic
│   │
│   ├── directory/
│   │   ├── layout.tsx                 # Guards: must be authenticated + is_approved
│   │   ├── page.tsx                   # Hub: greeting, stats, nav cards
│   │   ├── students/
│   │   │   ├── page.tsx               # Student card grid + search
│   │   │   └── [id]/page.tsx          # Student detail page
│   │   ├── parents/
│   │   │   └── page.tsx               # Parent card grid + search
│   │   ├── families/
│   │   │   ├── page.tsx               # Family list
│   │   │   └── [id]/page.tsx          # Family detail page
│   │   ├── original/page.tsx          # [LEFTOVER — likely legacy prototype]
│   │   └── test/page.tsx              # [LEFTOVER — dev test page]
│   │
│   ├── account/
│   │   ├── layout.tsx                 # Guards: authenticated + is_approved
│   │   ├── students/                  # Redirects to /account/profile/students
│   │   │   ├── page.tsx               # → redirect
│   │   │   ├── StudentForm.tsx        # [LEGACY — see profile/students for current form]
│   │   │   ├── new/page.tsx           # [LEGACY]
│   │   │   └── [id]/edit/page.tsx     # [LEGACY]
│   │   ├── family/
│   │   │   └── edit/
│   │   │       ├── page.tsx           # [LEGACY — older family edit route]
│   │   │       └── FamilyForm.tsx     # [LEGACY]
│   │   └── profile/
│   │       ├── layout.tsx             # Adds ProfileTabNav
│   │       ├── ProfileTabNav.tsx      # Tab navigation: Family / Parents / Students / Review
│   │       ├── family/
│   │       │   ├── page.tsx           # Family edit page (server)
│   │       │   └── ProfileFamilyForm.tsx  # Family edit form (client)
│   │       ├── parents/
│   │       │   ├── page.tsx           # Parent list
│   │       │   ├── ProfileParentForm.tsx   # Single parent form (client)
│   │       │   ├── ProfileParentsForm.tsx  # [purpose unclear — may be unused]
│   │       │   ├── new/page.tsx       # Add parent
│   │       │   └── [id]/page.tsx      # Edit parent
│   │       ├── students/
│   │       │   ├── page.tsx           # Student list
│   │       │   ├── new/page.tsx       # Add student
│   │       │   └── [id]/page.tsx      # Edit student
│   │       └── review/page.tsx        # Profile preview page
│   │
│   └── admin/
│       ├── layout.tsx                 # Guards: authenticated + is_approved + role check
│       ├── page.tsx                   # Admin dashboard
│       ├── requests/
│       │   ├── page.tsx               # Access request queue
│       │   └── ApproveRejectButtons.tsx
│       ├── photos/
│       │   ├── page.tsx               # Photo moderation queue
│       │   └── PhotoModerationButtons.tsx
│       ├── users/
│       │   ├── page.tsx               # User management (super_admin only)
│       │   └── UserRoleSelect.tsx
│       └── approved-emails/
│           ├── page.tsx               # Pre-approved email list
│           ├── ApprovedEmailsClient.tsx
│           └── actions.ts             # addApprovedEmails, deleteApprovedEmail
│
├── components/
│   ├── AppNav.tsx                     # Server: fetches role, renders AppNavClient
│   ├── AppNavClient.tsx               # Client: nav links, mobile menu, sign-out
│   ├── ApprovalBadge.tsx              # [exists, usage unclear]
│   ├── ContactForm.tsx                # Client: dialog + message form
│   ├── NavBar.tsx                     # [exists alongside AppNav — may be unused]
│   ├── OpenToTags.tsx                 # [exists — renders carpool/study/meetup tags]
│   ├── PageHeader.tsx                 # Simple title/subtitle header block
│   ├── PhotoUpload.tsx                # Client: file pick → base64 → server action
│   ├── PursuitBadge.tsx               # [exists, usage unclear]
│   ├── SoftDeleteBanner.tsx           # Client: deletion warning + cancel button
│   ├── StudentCard.tsx                # Directory student card
│   ├── VisibilityToggle.tsx           # [exists, usage unclear]
│   └── ui/                            # shadcn/ui primitives
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── switch.tsx
│       └── textarea.tsx
│
├── lib/
│   ├── actions/
│   │   ├── admin.ts                   # approveAccessRequest, rejectAccessRequest, approveStudentPhoto, hidePhoto, updateUserRole, revokeAccess
│   │   ├── contact.ts                 # sendContactMessage
│   │   ├── family.ts                  # upsertFamily, softDeleteFamily, cancelFamilyDeletion, upsertParent, deleteParent, sendFamilyInvite
│   │   ├── photo.ts                   # uploadPhotoBase64, removePhoto, getSignedUrl
│   │   └── student.ts                 # upsertStudent, deleteStudent, toggleStudentListing
│   ├── supabase/
│   │   ├── client.ts                  # Browser client (createBrowserClient)
│   │   ├── middleware.ts              # Middleware client + session refresh logic
│   │   └── server.ts                  # Server client (createClient) + service client (createServiceClient)
│   └── utils.ts                       # cn() helper (clsx + tailwind-merge)
│
├── middleware.ts                      # Thin wrapper calling updateSession()
└── types/
    └── index.ts                       # All TypeScript types (enums, DB rows, composites, form data)
```

---

## 10. Dev Workflow

### Prerequisites

- Node.js 20+
- A Supabase project with the schema migrated and storage bucket created

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=          # Used as redirect base for invite emails (falls back to SUPABASE_URL)
```

### Local setup

```bash
npm install
npm run dev        # http://localhost:3000
```

There is no `.env.example` file in the repo. You'll need to obtain values from the Supabase project settings.

### Schema changes

Schema lives entirely in Supabase. There are no migration files in this repo. Changes must be made in the Supabase dashboard or via the Supabase CLI separately. After changing the schema:
1. Update the corresponding TypeScript interface in `src/types/index.ts`
2. Update any server actions or queries that touch that table

### Adding a new server action

1. Create or add to a file in `src/lib/actions/`
2. Mark the file or function with `'use server'`
3. Always start with an auth/role check (`getApprovedUser()` or `requireAdmin()`)
4. Verify ownership before any write
5. Call `revalidatePath()` on affected routes
6. Return `ActionResult`

### Deploy

Standard `next build` + deploy to Vercel (or any Node.js host). `sharp` requires native binaries — Vercel handles this automatically. If self-hosting, ensure `sharp` is compatible with the runtime.

There is no CI/CD configuration file in this repo.

---

## 11. Design Tokens and UI Conventions

### Brand colors (used as hardcoded hex throughout the app)

| Color | Hex | Usage |
|---|---|---|
| Navy (primary) | `#002554` | Headings, buttons, nav links |
| Navy dark | `#003a7a` | Hover state for navy |
| Gold / amber | `#CB9700` | Section dividers, avatar ring, bullet dots |
| Gold text | `#A67C00` | Grade labels |
| Slate text | `#0A2F5A` | Hero section (directory hub) |

### shadcn CSS token colors (in `globals.css`)

| Token | Value |
|---|---|
| `--primary` | `#1D4E89` (brand navy, slightly lighter than hardcoded `#002554`) |
| `--secondary` | `#2E86AB` (teal accent) |
| `--destructive` | Standard red |
| `--radius` | `0.5rem` |

**Note:** The shadcn tokens are used by UI primitives (Button, Dialog, etc.), but most page-level styling uses hardcoded hex values directly in Tailwind classes. The two systems coexist but aren't fully unified.

### Rounding conventions

The app uses larger-than-default border radii consistently:
- Cards: `rounded-[1.75rem]` or `rounded-3xl`
- Buttons: `rounded-xl` or `rounded-2xl`
- Section panels: `rounded-2xl`
- Input fields: `rounded-lg` or `rounded-2xl`

### Typography

- Font: Inter (loaded via `next/font/google`)
- Headings: `text-[#002554]` (navy), `font-bold`
- Section headers: small-caps style — `text-sm font-semibold uppercase tracking-wide text-[#002554]` with a gold left-border accent

### Photo handling conventions

- All photos in storage are resized to max 800×800px at 85% JPEG quality
- Signed URLs have 1-hour TTL — generated fresh on each page render (no caching)
- Avatar fallback: initials in a circle, or an SVG person icon for detail pages
- Development fallback: `randomuser.me` portraits (deterministic by name hash)

---

## 12. Status: Built vs. In-Progress vs. Missing

### Fully built

- Auth flow (magic link, Google OAuth, callback, waiting page)
- Role-based access gating (middleware + layout guards + action guards)
- Pre-approved emails and invite system
- Student, parent, and family directory with search
- Profile creation and editing (family, parents, students)
- Photo upload with server-side resize (sharp)
- Admin panel: access requests, photo moderation, user management, approved emails
- Contact form (DB insert + Edge Function trigger)
- Soft-delete for families with 30-day purge window
- Profile review/preview page

### Incomplete / inconsistent

**Bug: Student photo moderation is bypassed on upload.**
`uploadPhotoBase64()` in `src/lib/actions/photo.ts:105` sets `student_photo_status: 'approved'` immediately on upload. The admin photo queue only shows students with `status = 'pending'`, so it will always be empty for user-uploaded photos. The status should be `'pending'` on upload and set to `'approved'` only after admin review. The `PhotoUpload` component correctly shows a "pending admin review" message when `currentStatus === 'pending'`, but the upload action never actually creates that state.

**Security: `addApprovedEmails` action has no role check.**
`src/app/admin/approved-emails/actions.ts` only verifies the user is logged in, not that they're an admin. Any authenticated user who can call this action directly could pre-approve any email. In practice the UI is gated, but it's not enforced in the action itself.

**`createServiceClient` is exported but unused.**
`src/lib/supabase/server.ts` exports `createServiceClient`, but all code that needs the service role constructs an inline `createClient` from `@supabase/supabase-js` directly. This export is dead code.

**`contact.ts` references fields not in `DbFamily`.**
`sendContactMessage` reads `family.public_email` and `family.show_email` from the families query, but neither column is in the `DbFamily` type or visible in the families create/edit flow. These are either DB columns not reflected in the TypeScript types, or leftover references to a planned feature that was never implemented. The email notification will silently skip if these are null.

**Legacy/duplicate routes exist:**
- `src/app/account/family/edit/` — older family edit flow, superseded by `/account/profile/family/`
- `src/app/account/students/[id]/edit/` — older student edit, superseded by `/account/profile/students/[id]/`
- `src/app/directory/original/page.tsx` and `/directory/test/page.tsx` — leftover dev pages, accessible by any logged-in user

**Hard delete / purge logic is absent.**
`softDeleteFamily()` sets `purge_after` 30 days out, but there is no scheduled job or Edge Function in this codebase to actually delete the family after that date. This must exist in Supabase (e.g. a pg_cron job or scheduled Edge Function) or is not yet implemented.

**`ProfileParentsForm.tsx` purpose is unclear.**
`src/app/account/profile/parents/ProfileParentsForm.tsx` exists alongside `ProfileParentForm.tsx`. Its role in the current routing is ambiguous — it may be unused.

**Several components appear unused:**
`NavBar.tsx`, `ApprovalBadge.tsx`, `PursuitBadge.tsx`, `VisibilityToggle.tsx` — exist but no imports were found during review.

### Not yet started

- Email notifications to users when their access request is approved/rejected
- Search filtering by club on the student directory (query param `club` is wired up in the URL but the actual filter is done client-side in JS after the DB query, not pushed down to Postgres)
- Grade filter UI on the student page (the `grade` query param is handled in the server query, but no grade filter UI control is visible in the page)
- Any mobile-specific optimizations beyond the responsive grid and hamburger nav
