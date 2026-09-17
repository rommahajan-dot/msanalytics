'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerDownLeft, FileText, Loader2, Search, Sparkles } from 'lucide-react'
import {
  CATEGORIES,
  STATUS_META,
  type RegionId,
  type Report,
} from '@/lib/reports-config'
import { useOverlay } from '@/hooks/use-overlay'
import { cn } from '@/lib/utils'

export function CommandMenu({
  open,
  onClose,
  region,
  reports,
  onSelectReport,
  onOpenSql,
}: {
  open: boolean
  onClose: () => void
  region: RegionId
  reports: Report[]
  onSelectReport: (id: string) => void
  onOpenSql: (r: Report) => void
}) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useOverlay(open, onClose)

  useEffect(() => {
    if (open) {
      setQ('')
      setAnswer(null)
      setError(null)
      setAsking(false)
      const t = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
  }, [open])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return reports
    return reports.filter((r) => {
      const cat = CATEGORIES.find((c) => c.id === r.questionCategory)
      return (
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        (cat?.tag.toLowerCase().includes(term) ?? false) ||
        r.status.includes(term)
      )
    })
  }, [q, reports])

  async function ask() {
    const question = q.trim()
    if (!question || asking) return
    setAsking(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region }),
      })
      if (!res.ok) throw new Error('bad status')
      const data = await res.json()
      setAnswer(data.answer ?? 'No answer returned.')
    } catch {
      setError('Analytics assistant is unavailable right now. Try the catalog search below.')
    } finally {
      setAsking(false)
    }
  }

  function activate(r: Report) {
    onSelectReport(r.id)
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Ask analytics / command menu"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-ms-border-hi bg-ms-surface shadow-2xl">
        {/* input */}
        <div className="flex items-center gap-3 border-b border-ms-border px-4 py-3.5">
          <Search className="size-4 shrink-0 text-ms-txt3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'Enter') {
                e.preventDefault()
                if (results.length > 0 && q.trim()) activate(results[0])
                else ask()
              }
            }}
            placeholder="Search reports, or ask a question…"
            className="w-full bg-transparent text-[0.9rem] text-ms-txt outline-none placeholder:text-ms-txt3"
          />
          <kbd className="hidden rounded border border-ms-border px-1.5 py-0.5 font-mono text-[0.6rem] text-ms-txt3 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="ms-scroll max-h-[52vh] overflow-y-auto">
          {/* ask AI row */}
          {q.trim() && (
            <button
              type="button"
              onClick={ask}
              disabled={asking}
              className="flex w-full items-center gap-3 border-b border-ms-border px-4 py-3 text-left transition-colors hover:bg-ms-surface-hi"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ms-accent-sub text-ms-accent">
                {asking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </span>
              <span className="flex-1 text-[0.8rem] text-ms-txt">
                Ask the analytics assistant:{' '}
                <span className="font-semibold text-ms-accent">“{q.trim()}”</span>
              </span>
              <CornerDownLeft className="size-3.5 text-ms-txt3" />
            </button>
          )}

          {(answer || error) && (
            <div className="border-b border-ms-border bg-ms-bg px-4 py-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ms-accent">
                <Sparkles className="size-3" /> Assistant
              </p>
              <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed text-ms-txt2">
                {error ?? answer}
              </p>
            </div>
          )}

          {/* report results */}
          <div className="p-1.5">
            <p className="px-2.5 pb-1 pt-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-ms-txt3">
              {q.trim() ? `${results.length} matching report${results.length === 1 ? '' : 's'}` : 'All reports'}
            </p>
            {results.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.questionCategory)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => (r.sqlSnippet && r.status === 'stale' ? (onOpenSql(r), onClose()) : activate(r))}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-ms-surface-hi"
                >
                  <FileText className="size-4 shrink-0 text-ms-txt3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.82rem] font-medium text-ms-txt">
                      {r.title}
                    </span>
                    <span className="block truncate font-mono text-[0.6rem] text-ms-txt3">
                      {cat?.tag} · {STATUS_META[r.status].label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      r.status === 'fresh' && 'bg-ms-green',
                      r.status === 'live' && 'bg-ms-violet',
                      r.status === 'stale' && 'bg-ms-amber',
                      r.status === 'planned' && 'bg-ms-slate',
                    )}
                  />
                </button>
              )
            })}
            {results.length === 0 && !answer && !asking && (
              <p className="px-2.5 py-6 text-center text-[0.78rem] text-ms-txt3">
                No reports match. Press Enter to ask the assistant instead.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
