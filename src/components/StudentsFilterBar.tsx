'use client'

import { useRouter } from 'next/navigation'
import { GRADES } from '@/types'

interface Props {
  clubTags: { id: string; name: string }[]
  currentGrades: string[]
  currentClub: string
  currentQ: string
}

export function StudentsFilterBar({ clubTags, currentGrades, currentClub, currentQ }: Props) {
  const router = useRouter()

  function buildUrl(grades: string[], club: string) {
    const params = new URLSearchParams()
    if (currentQ) params.set('q', currentQ)
    grades.forEach((g) => params.append('grade', g))
    if (club) params.set('club', club)
    const qs = params.toString()
    return `/directory/students${qs ? `?${qs}` : ''}`
  }

  function toggleGrade(grade: string) {
    const next = currentGrades.includes(grade)
      ? currentGrades.filter((g) => g !== grade)
      : [...currentGrades, grade]
    router.push(buildUrl(next, currentClub))
  }

  function handleClubChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildUrl(currentGrades, e.target.value))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {GRADES.map((grade) => {
        const active = currentGrades.includes(grade)
        return (
          <button
            key={grade}
            type="button"
            onClick={() => toggleGrade(grade)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? 'border-[#002554] bg-[#002554] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {grade}
          </button>
        )
      })}

      {clubTags.length > 0 && (
        <select
          value={currentClub}
          onChange={handleClubChange}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-sky-400"
        >
          <option value="">All clubs</option>
          {clubTags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
