'use client'

import { useState } from 'react'
import { ArrowUpRight, ChevronRight, ExternalLink } from 'lucide-react'
import { ageLabel, STATUS_META, type Report, type ReportStatus } from '@/lib/reports-config'
import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'

const STATUS_COLOR: Record<ReportStatus, string> = {
  Current: 'var(--ms-green)',
  Live: 'var(--ms-violet)',
  Planned: 'var(--ms-slate)',
}

const LEFT_BORDER: Record<ReportStatus, string> = {
  Current: 'border-l-ms-green',
  Live: 'border-l-ms-violet',
  Planned: 'border-l-ms-border',
}

const STATUS_BADGE: Record<ReportStatus, string> = {
  Current: 'bg-ms-green-sub text-ms-green',
  Live: 'bg-ms-violet-sub text-ms-violet',
  Planned: 'bg-ms-slate-sub text-ms-slate',
}

const DOT: Record<ReportStatus, string> = {
  Current: 'bg-ms-green',
  Live: 'bg-ms-violet',
  Planned: 'bg-ms-slate',
}

function freshnessText(r: Report): string {
  switch (r.status) {
    case 'Current':
      return r.generatedDate
        ? `Generated ${r.generatedDate} · ${ageLabel(r.generatedDate)}`
        : 'Report pending'
    case 'Live':
      return 'Live · Refreshes on demand'
    case 'Planned':
      return 'Not yet built · In backlog'
  }
}

function cadenceBadge(r: Report): string | null {
  if (r.status === 'Live') return null
  if (r.status === 'Planned') return null
  return `Static · ${r.cadence}`
}

export function ReportCard({ report }: { report: Report }) {
  const [open, setOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const cb = cadenceBadge(report)

  return (
    <article
      id={report.id}
      className={cn(
        'flex scroll-mt-32 flex-col gap-2.5 rounded-[7px] border border-ms-border border-l-[3px] bg-ms-surface px-5 pt-5 transition-colors hover:bg-ms-surface-hi',
        LEFT_BORDER[report.status],
        report.status === 'Planned' && 'opacity-85',
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
        {cb && (
          <span className="rounded-[3px] border border-ms-border bg-ms-surface-hi px-1.5 pb-[3px] pt-0.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.1em] text-ms-txt3">
            {cb}
          </span>
        )}
      </div>

      <h3 className="font-brand text-[0.9rem] font-semibold leading-tight tracking-tight text-ms-txt">
        {report.name}
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
          {report.status === 'Live' && (
            <span className={cn('ms-ping absolute inline-flex size-full rounded-full', DOT.Live)} />
          )}
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              DOT[report.status],
              report.status === 'Live' && 'ms-livepulse',
            )}
          />
        </span>
        <span>{freshnessText(report)}</span>
      </div>

      {/* footer */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-ms-border py-3">
        {report.status === 'Live' ? (
          report.latestUrl ? (
            <a
              href={report.latestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ms-accent hover:underline"
            >
              Open app <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="cursor-default text-[0.75rem] font-semibold text-ms-txt3">
              No app yet
            </span>
          )
        ) : report.latestUrl ? (
          <a
            href={report.latestUrl}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ms-accent hover:underline"
          >
            Open latest <ArrowUpRight className="size-3" />
          </a>
        ) : (
          <span className="cursor-default text-[0.75rem] font-semibold text-ms-txt3">
            No report yet
          </span>
        )}
      </div>

      {/* why this card looks like this */}
      {report.notes && (
        <div className={cn('-mt-2', report.history.length === 0 && 'pb-4')}>
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            aria-expanded={notesOpen}
            className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-wide text-ms-txt3 hover:text-ms-txt2"
          >
            <ChevronRight className={cn('size-3 transition-transform', notesOpen && 'rotate-90')} />
            Why this card looks like this
          </button>
          {notesOpen && (
            <p className="mt-2 border-l-2 border-ms-border pl-2.5 text-[0.72rem] leading-[1.55] text-ms-txt2">
              {report.notes}
            </p>
          )}
        </div>
      )}

      {/* history accordion */}
      {report.history.length > 0 && (
        <div className="-mt-2 pb-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-wide text-ms-txt3 hover:text-ms-txt2"
          >
            <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
            {report.history.length} prior version
            {report.history.length > 1 ? 's' : ''}
          </button>
          {open && (
            <div className="mt-2 flex flex-col gap-1.5 pl-0.5">
              {report.history.map((h) => (
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
