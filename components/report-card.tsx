'use client'

import { useState } from 'react'
import { ArrowUpRight, ChevronRight, Code2, ExternalLink } from 'lucide-react'
import { ageLabel, STATUS_META, type Report, type ReportStatus } from '@/lib/reports-config'
import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'

const STATUS_COLOR: Record<ReportStatus, string> = {
  fresh: 'var(--ms-green)',
  stale: 'var(--ms-amber)',
  live: 'var(--ms-violet)',
  planned: 'var(--ms-slate)',
}

const LEFT_BORDER: Record<ReportStatus, string> = {
  fresh: 'border-l-ms-green',
  stale: 'border-l-ms-amber',
  live: 'border-l-ms-violet',
  planned: 'border-l-ms-border',
}

const STATUS_BADGE: Record<ReportStatus, string> = {
  fresh: 'bg-ms-green-sub text-ms-green',
  stale: 'bg-ms-amber-sub text-ms-amber',
  live: 'bg-ms-violet-sub text-ms-violet',
  planned: 'bg-ms-slate-sub text-ms-slate',
}

const DOT: Record<ReportStatus, string> = {
  fresh: 'bg-ms-green',
  stale: 'bg-ms-amber',
  live: 'bg-ms-violet',
  planned: 'bg-ms-slate',
}

function freshnessText(r: Report): string {
  switch (r.status) {
    case 'fresh':
      return `Generated ${r.generatedAt} · ${ageLabel(r.generatedAt)}`
    case 'stale':
      return 'SQL available · HTML report pending'
    case 'live':
      return 'Live · Refreshes on demand'
    case 'planned':
      return 'Not yet built · In backlog'
  }
}

function typeBadge(r: Report): string | null {
  if (r.type === 'sql') return 'SQL Only'
  if (r.type === 'live') return null
  return `Static · ${r.cadence}`
}

export function ReportCard({
  report,
  onOpenSql,
}: {
  report: Report
  onOpenSql: (r: Report) => void
}) {
  const [open, setOpen] = useState(false)
  const tb = typeBadge(report)
  const hasSql = !!report.sqlSnippet

  return (
    <article
      id={report.id}
      className={cn(
        'flex scroll-mt-32 flex-col gap-2.5 rounded-[7px] border border-ms-border border-l-[3px] bg-ms-surface px-5 pt-5 transition-colors hover:bg-ms-surface-hi',
        LEFT_BORDER[report.status],
        report.status === 'planned' && 'opacity-85',
      )}
    >
      {/* badges */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            'rounded-[3px] px-1.5 pb-[3px] pt-0.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.1em]',
            STATUS_BADGE[report.status],
          )}
        >
          {STATUS_META[report.status].badgeLabel}
        </span>
        {tb && (
          <span className="rounded-[3px] border border-ms-border bg-ms-surface-hi px-1.5 pb-[3px] pt-0.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.1em] text-ms-txt3">
            {tb}
          </span>
        )}
      </div>

      <h3 className="font-brand text-[0.9rem] font-semibold leading-tight tracking-tight text-ms-txt">
        {report.title}
      </h3>
      <p className="flex-1 text-[0.77rem] leading-[1.58] text-ms-txt2">{report.description}</p>

      {report.sparkline.length >= 2 && (
        <div className="pt-1">
          <Sparkline data={report.sparkline} color={STATUS_COLOR[report.status]} />
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ms-txt3">
            {report.sparkLabel}
          </p>
        </div>
      )}

      {/* freshness */}
      <div className="flex items-center gap-2 font-mono text-[0.65rem] tabular-nums text-ms-txt3">
        <span className="relative flex size-1.5 shrink-0">
          {report.status === 'live' && (
            <span className={cn('ms-ping absolute inline-flex size-full rounded-full', DOT.live)} />
          )}
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              DOT[report.status],
              report.status === 'live' && 'ms-livepulse',
            )}
          />
        </span>
        <span>{freshnessText(report)}</span>
      </div>

      {/* footer */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-ms-border py-3">
        {report.status === 'planned' ? (
          <span className="cursor-default font-[inherit] text-[0.75rem] font-semibold text-ms-txt3">
            {report.type === 'live' ? 'No app yet' : 'No report yet'}
          </span>
        ) : report.status === 'live' ? (
          <a
            href={report.reportUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ms-accent hover:underline"
          >
            Open app <ExternalLink className="size-3" />
          </a>
        ) : report.status === 'stale' ? (
          <button
            type="button"
            onClick={() => onOpenSql(report)}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ms-accent hover:underline"
          >
            <Code2 className="size-3.5" /> View SQL
          </button>
        ) : (
          <a
            href={report.reportUrl ?? '#'}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ms-accent hover:underline"
          >
            Open latest <ArrowUpRight className="size-3" />
          </a>
        )}

        {hasSql && report.status !== 'stale' && (
          <button
            type="button"
            onClick={() => onOpenSql(report)}
            aria-label={`View SQL for ${report.title}`}
            className="inline-flex items-center gap-1 rounded-md border border-ms-border px-2 py-1 font-mono text-[0.6rem] text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt2"
          >
            <Code2 className="size-3" /> SQL
          </button>
        )}
      </div>

      {/* history accordion */}
      {report.historyLinks.length > 0 && (
        <div className="-mt-2 pb-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-wide text-ms-txt3 hover:text-ms-txt2"
          >
            <ChevronRight
              className={cn('size-3 transition-transform', open && 'rotate-90')}
            />
            {report.historyLinks.length} prior version
            {report.historyLinks.length > 1 ? 's' : ''}
          </button>
          {open && (
            <div className="mt-2 flex flex-col gap-1.5 pl-0.5">
              {report.historyLinks.map((h) => (
                <div
                  key={h.date}
                  className="flex items-center gap-2.5 font-mono text-[0.63rem] tabular-nums text-ms-txt2"
                >
                  <span className="min-w-[82px] shrink-0 text-ms-txt3">{h.date}</span>
                  <a href={h.url} className="text-ms-txt2 hover:text-ms-accent">
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
