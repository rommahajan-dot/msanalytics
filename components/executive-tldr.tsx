'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import type { RegionId } from '@/lib/reports-config'
import { cn } from '@/lib/utils'

export function ExecutiveTldr({ region }: { region: RegionId }) {
  const [takeaways, setTakeaways] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/tldr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      })
      if (!res.ok) throw new Error('bad status')
      const data = await res.json()
      if (!Array.isArray(data.takeaways) || data.takeaways.length === 0)
        throw new Error('empty')
      setTakeaways(data.takeaways)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section
      aria-label="AI executive summary"
      className="rounded-lg border border-ms-border bg-gradient-to-br from-ms-surface to-ms-bg p-5 sm:p-6"
    >
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ms-accent">
          <Sparkles className="size-3.5" />
          AI Executive TL;DR
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Regenerate summary"
          className="inline-flex items-center gap-1.5 rounded-md border border-ms-border px-2 py-1 font-mono text-[0.6rem] text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt2 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          Regenerate
        </button>
      </div>

      {loading ? (
        <ul className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-3.5 animate-pulse rounded bg-ms-border"
              style={{ width: `${88 - i * 12}%` }}
            />
          ))}
        </ul>
      ) : error ? (
        <p className="flex items-center gap-2 text-[0.8rem] text-ms-txt2">
          <AlertCircle className="size-4 shrink-0 text-ms-amber" />
          Couldn&apos;t generate a summary right now. The catalog below is fully browsable.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {takeaways.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-[0.85rem] leading-relaxed text-ms-txt">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ms-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
