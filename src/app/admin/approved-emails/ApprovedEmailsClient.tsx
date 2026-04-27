'use client'

import { useRef, useState, useTransition } from 'react'
import { addApprovedEmails, deleteApprovedEmail, resetApprovedEmail } from './actions'

type ApprovedEmail = {
  id: string
  email: string
  added_at: string
  claimed_at: string | null
  claimed_by_user: { email: string } | { email: string }[] | null
}

export function ApprovedEmailsClient({ emails }: { emails: ApprovedEmail[] }) {
  const [textarea, setTextarea] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const claimed = emails.filter((e) => e.claimed_at !== null)
  const waiting = emails.filter((e) => e.claimed_at === null)

  function handleAdd() {
    const lines = textarea.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    startTransition(async () => {
      await addApprovedEmails(lines)
      setTextarea('')
    })
  }

  function handleCsvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
      const found = text.match(emailRegex) ?? []
      const deduped = [...new Set(found.map((e) => e.toLowerCase()))]
      if (deduped.length === 0) return
      startTransition(async () => {
        await addApprovedEmails(deduped)
        if (fileRef.current) fileRef.current.value = ''
      })
    }
    reader.readAsText(file)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteApprovedEmail(id)
    })
  }

  function handleReset(id: string) {
    startTransition(async () => {
      await resetApprovedEmail(id)
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Approved emails</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {emails.length} added · {claimed.length} claimed · {waiting.length} waiting
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">Add emails</h2>
        <div className="space-y-2">
          <textarea
            value={textarea}
            onChange={(e) => setTextarea(e.target.value)}
            placeholder="Paste emails, one per line"
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002554]/20"
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !textarea.trim()}
            className="rounded-lg bg-[#002554] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a7a] disabled:opacity-50 transition"
          >
            {isPending ? 'Adding…' : 'Add emails'}
          </button>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <label className="text-sm font-medium text-slate-700">Or upload a CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvChange}
            disabled={isPending}
            className="mt-2 block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
      </div>

      {emails.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Email</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Added</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Claimed by</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emails.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-slate-800">{row.email}</td>
                  <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                    {new Date(row.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {row.claimed_at ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        Claimed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Waiting
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                    {(Array.isArray(row.claimed_by_user)
                      ? row.claimed_by_user[0]?.email
                      : row.claimed_by_user?.email) ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.claimed_at ? (
                      <button
                        onClick={() => handleReset(row.id)}
                        disabled={isPending}
                        className="text-xs text-amber-500 hover:text-amber-700 disabled:opacity-50 transition"
                      >
                        Reset
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emails.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No approved emails yet.</p>
      )}
    </div>
  )
}
