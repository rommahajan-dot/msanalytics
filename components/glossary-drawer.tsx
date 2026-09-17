'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { GLOSSARY, type Report } from '@/lib/reports-config'
import { useOverlay } from '@/hooks/use-overlay'

export function GlossaryDrawer({
  open,
  onClose,
  reports,
  onSelectReport,
}: {
  open: boolean
  onClose: () => void
  reports: Report[]
  onSelectReport: (id: string) => void
}) {
  const [q, setQ] = useState('')
  useOverlay(open, onClose)

  const titleById = useMemo(
    () => Object.fromEntries(reports.map((r) => [r.id, r.title])),
    [reports],
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return GLOSSARY
    return GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(term) ||
        g.definition.toLowerCase().includes(term) ||
        (g.formula ?? '').toLowerCase().includes(term),
    )
  }, [q])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Metric glossary"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="ms-scroll absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ms-border-hi bg-ms-surface shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-ms-border bg-ms-surface px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ms-accent">
                Glossary
              </p>
              <h2 className="mt-1 font-brand text-[1.05rem] font-semibold text-ms-txt">
                Metric Definitions
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close glossary"
              className="grid size-8 place-items-center rounded-md border border-ms-border text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md border border-ms-border bg-ms-bg px-3 py-2">
            <Search className="size-3.5 text-ms-txt3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search definitions…"
              className="w-full bg-transparent text-[0.8rem] text-ms-txt outline-none placeholder:text-ms-txt3"
            />
          </div>
        </div>

        <div className="flex flex-col divide-y divide-ms-border px-5">
          {filtered.map((g) => (
            <div key={g.term} className="py-4">
              <h3 className="font-brand text-[0.85rem] font-semibold text-ms-txt">{g.term}</h3>
              {g.formula && (
                <code className="mt-1.5 block rounded border border-ms-border bg-ms-bg px-2 py-1 font-mono text-[0.68rem] text-ms-accent">
                  {g.formula}
                </code>
              )}
              <p className="mt-2 text-[0.77rem] leading-relaxed text-ms-txt2">{g.definition}</p>
              {g.relatedReportIds.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {g.relatedReportIds
                    .filter((id) => titleById[id])
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          onSelectReport(id)
                          onClose()
                        }}
                        className="rounded-full border border-ms-border bg-ms-surface-hi px-2.5 py-1 font-mono text-[0.6rem] text-ms-txt2 transition-colors hover:border-ms-accent hover:text-ms-accent"
                      >
                        {titleById[id]}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-[0.8rem] text-ms-txt3">
              No definitions match “{q}”.
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}
