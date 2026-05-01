'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudentAdvancing {
  name: string
  from: string
  to: string
}

interface BecomingAlumni {
  name: string
}

interface FamilyBecomingAlumni {
  familyName: string
}

interface PreviewResult {
  dry_run: boolean
  graduation_year: number
  studentsAdvancing: StudentAdvancing[]
  studentsBecomingAlumni: BecomingAlumni[]
  familiesBecomingAlumni: FamilyBecomingAlumni[]
  committed?: boolean
}

type Stage = 'idle' | 'loading' | 'preview' | 'confirming' | 'done' | 'error'

export default function GradeAdvancePage() {
  const [stage, setStage] = useState<Stage>('idle')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function getToken() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function handlePreview() {
    setStage('loading')
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/advance-grades`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dry_run: true }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unexpected error')
      }
      const data: PreviewResult = await res.json()
      setPreview(data)
      setStage('preview')
    } catch (e: any) {
      setError(e.message)
      setStage('error')
    }
  }

  async function handleCommit() {
    setStage('confirming')
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/advance-grades`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dry_run: false }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unexpected error')
      }
      setStage('done')
    } catch (e: any) {
      setError(e.message)
      setStage('error')
    }
  }

  function handleReset() {
    setStage('idle')
    setPreview(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">End-of-year grade advance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Advances every active student one grade. 12th graders become alumni. Families with no
          remaining active students are also marked as alumni.
        </p>
      </div>

      {/* Idle */}
      {stage === 'idle' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm space-y-4">
          <p className="text-sm text-slate-700">
            Click <strong>Preview changes</strong> to see exactly what will happen before
            committing. Nothing will be changed until you confirm.
          </p>
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-xl bg-[#002554] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#003a7a] transition"
          >
            Preview changes
          </button>
        </div>
      )}

      {/* Loading */}
      {stage === 'loading' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-slate-500">Loading preview…</p>
        </div>
      )}

      {/* Preview */}
      {stage === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm space-y-5">
            <p className="text-sm font-medium text-slate-700">
              Graduation year for new alumni:{' '}
              <span className="text-[#002554] font-semibold">{preview.graduation_year}</span>
            </p>

            {/* Advancing */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Students advancing a grade ({preview.studentsAdvancing.length})
              </h2>
              {preview.studentsAdvancing.length === 0 ? (
                <p className="text-sm text-slate-400">None</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {preview.studentsAdvancing.map((s, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-800">{s.name}</span>
                      <span className="text-slate-500">
                        {s.from} → <span className="text-[#002554] font-medium">{s.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Becoming alumni */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Students becoming alumni ({preview.studentsBecomingAlumni.length})
              </h2>
              {preview.studentsBecomingAlumni.length === 0 ? (
                <p className="text-sm text-slate-400">None</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {preview.studentsBecomingAlumni.map((s, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-800">{s.name}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Alumni {preview.graduation_year}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Families becoming alumni */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Families becoming alumni ({preview.familiesBecomingAlumni.length})
              </h2>
              {preview.familiesBecomingAlumni.length === 0 ? (
                <p className="text-sm text-slate-400">None</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {preview.familiesBecomingAlumni.map((f, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-800">The {f.familyName} Family</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Will be hidden from directory
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Confirm / Cancel */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCommit}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition"
            >
              Confirm and commit changes
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirming */}
      {stage === 'confirming' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-slate-500">Applying changes…</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-5 shadow-sm space-y-3">
          <p className="text-sm font-medium text-green-800">
            ✓ Grade advance complete. All changes have been saved.
          </p>
          <button
            onClick={handleReset}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Run again
          </button>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm space-y-3">
          <p className="text-sm font-medium text-red-800">Error: {error}</p>
          <button
            onClick={handleReset}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
