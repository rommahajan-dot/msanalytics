'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Minus, RefreshCw, Sparkles } from 'lucide-react'
import type { RegionId } from '@/lib/reports-config'
import type { Callout } from '@/lib/briefing'
import { cn } from '@/lib/utils'

export function ExecutiveTldr({ region }: { region: RegionId }) {
  const [callouts, setCallouts] = useState<Callout[]>([])
  const [asOf, setAsOf] = useState<string | null>(null)
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
      if (!Array.isArray(data.callouts) || data.callouts.length === 0) throw new Error('empty')
      setCallouts(data.callouts)
      setAsOf(data.asOf ?? null)
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ms-accent">
            <Sparkles className="size-3.5" />
            AI Executive TL;DR
          </p>
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ms-txt3">
            WBR metrics snapshot{asOf ? ` · wk ending ${asOf}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Regenerate summary"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ms-border px-2 py-1 font-mono text-[0.6rem] text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt2 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          Regenerate
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-md border border-ms-border bg-ms-surface/60 p-4">
              <div className="h-2.5 w-24 animate-pulse rounded bg-ms-border" />
              <div className="mt-3 h-6 w-20 animate-pulse rounded bg-ms-border" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-ms-border" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="flex items-center gap-2 text-[0.8rem] text-ms-txt2">
          <AlertCircle className="size-4 shrink-0 text-ms-amber" />
          No metrics snapshot for this region yet. The catalog below is fully browsable.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {callouts.map((c) => (
            <CalloutCard key={c.id} callout={c} />
          ))}
        </div>
      )}
    </section>
  )
}

const SENTIMENT: Record<Callout['sentiment'], { text: string; chip: string }> = {
  good: { text: 'text-ms-green', chip: 'bg-ms-green-sub text-ms-green' },
  bad: { text: 'text-ms-amber', chip: 'bg-ms-amber-sub text-ms-amber' },
  neutral: { text: 'text-ms-txt2', chip: 'bg-ms-surface-hi text-ms-txt2' },
}

function CalloutCard({ callout: c }: { callout: Callout }) {
  const s = SENTIMENT[c.sentiment]
  const Arrow = c.direction === 'up' ? ArrowUp : c.direction === 'down' ? ArrowDown : Minus
  return (
    <div className="flex flex-col rounded-md border border-ms-border bg-ms-surface/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ms-txt3">
          {c.label}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[0.58rem] tabular-nums',
            s.chip,
          )}
        >
          <Arrow className="size-2.5" />
          {c.deltaLabel}
        </span>
      </div>
      <p className={cn('mt-2 font-display text-2xl font-bold tabular-nums', s.text)}>
        {c.valueLabel}
      </p>
      <p className="mt-2 text-[0.82rem] leading-relaxed text-ms-txt">{c.text}</p>
    </div>
  )
}
