'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, X } from 'lucide-react'
import type { Report } from '@/lib/reports-config'
import { useOverlay } from '@/hooks/use-overlay'

export function SqlDialog({
  report,
  onClose,
}: {
  report: Report | null
  onClose: () => void
}) {
  const open = !!report
  const [copied, setCopied] = useState(false)
  useOverlay(open, onClose)

  if (!open || typeof document === 'undefined') return null

  const copy = async () => {
    if (!report.sqlSnippet) return
    try {
      await navigator.clipboard.writeText(report.sqlSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`SQL for ${report.title}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-ms-border-hi bg-ms-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ms-border px-5 py-4">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ms-accent">
              SQL Query
            </p>
            <h2 className="mt-1 font-brand text-[0.95rem] font-semibold text-ms-txt">
              {report.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md border border-ms-border px-2.5 py-1.5 font-mono text-[0.65rem] text-ms-txt2 transition-colors hover:border-ms-border-hi hover:text-ms-txt"
            >
              {copied ? <Check className="size-3.5 text-ms-green" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-md border border-ms-border text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="ms-scroll overflow-auto bg-ms-bg px-5 py-4">
          <pre className="font-mono text-[0.72rem] leading-relaxed text-ms-txt">
            <code>{report.sqlSnippet}</code>
          </pre>
        </div>
      </div>
    </div>,
    document.body,
  )
}
