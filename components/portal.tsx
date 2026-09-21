'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Command, Search } from 'lucide-react'
import {
  portalStats,
  REPORTS,
  reportsForRegion,
  SECTIONS,
  type RegionId,
} from '@/lib/reports-config'
import { SiteHeader } from '@/components/site-header'
import { ExecutiveTldr } from '@/components/executive-tldr'
import { ReportCard } from '@/components/report-card'
import { GlossaryDrawer } from '@/components/glossary-drawer'
import { CommandMenu } from '@/components/command-menu'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'Current' | 'Live' | 'Planned'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Current', label: 'Current' },
  { id: 'Live', label: 'Live' },
  { id: 'Planned', label: 'Planned' },
]

export function Portal() {
  const [region, setRegion] = useState<RegionId>('global')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  // Reports scoped to the selected region ("Global" shows all).
  const regionReports = useMemo(() => reportsForRegion(region), [region])
  const stats = useMemo(() => portalStats(regionReports), [regionReports])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return regionReports.filter((r) => {
      const matchesFilter = filter === 'all' ? true : r.status === filter
      const section = SECTIONS.find((s) => s.id === r.section)
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (section?.tag.toLowerCase().includes(q) ?? false)
      return matchesFilter && matchesSearch
    })
  }, [regionReports, search, filter])

  // Selecting a report from search/glossary: jump to Global so any card is
  // reachable regardless of the active region tab, then scroll + highlight.
  const selectReport = useCallback((id: string) => {
    setRegion('global')
    setFilter('all')
    setSearch('')
    setGlossaryOpen(false)
    setCommandOpen(false)
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(id)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-ms-accent', 'ring-offset-2', 'ring-offset-ms-bg')
        setTimeout(
          () =>
            el.classList.remove('ring-2', 'ring-ms-accent', 'ring-offset-2', 'ring-offset-ms-bg'),
          1600,
        )
      }, 80)
    })
  }, [])

  const regionHasReports = regionReports.length > 0
  const totalMatches = visible.length

  return (
    <div className="min-h-dvh bg-ms-bg">
      <SiteHeader
        region={region}
        onRegionChange={setRegion}
        onOpenCommand={() => setCommandOpen(true)}
        onOpenGlossary={() => setGlossaryOpen(true)}
      />

      <main className="mx-auto max-w-[1140px] px-5 pb-24 pt-10 sm:px-8">
        {/* hero */}
        <div className="max-w-3xl">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ms-accent">
            Analytics Suite · {region.toUpperCase()}
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-ms-txt sm:text-[2.8rem]">
            Every Managed Shipping insight, organized by the question it answers.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-[0.95rem] leading-relaxed text-ms-txt2">
            One home for analyses, trackers, and live monitors — with freshness and history
            on every report. Ask a question with{' '}
            <kbd className="inline-flex items-center gap-0.5 rounded border border-ms-border bg-ms-surface px-1.5 py-0.5 font-mono text-[0.72rem] text-ms-txt2">
              <Command className="size-3" />
              K
            </kbd>
            .
          </p>
        </div>

        {/* stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Reports" value={stats.reports} accent="text-ms-txt" dot="bg-ms-slate" />
          <StatChip label="Current" value={stats.current} accent="text-ms-green" dot="bg-ms-green" />
          <StatChip label="Live monitors" value={stats.live} accent="text-ms-violet" dot="bg-ms-violet" />
          <StatChip label="In backlog" value={stats.planned} accent="text-ms-txt2" dot="bg-ms-slate" />
        </div>

        {/* AI summary */}
        <div className="mt-8">
          <ExecutiveTldr region={region} />
        </div>

        {/* filter bar */}
        <div className="sticky top-[95px] z-30 -mx-5 mt-10 border-y border-ms-border bg-ms-bg/90 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 rounded-md border border-ms-border bg-ms-surface px-3 py-2 sm:w-72">
              <Search className="size-3.5 shrink-0 text-ms-txt3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter reports…"
                className="w-full bg-transparent text-[0.8rem] text-ms-txt outline-none placeholder:text-ms-txt3"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={cn(
                    'rounded-full border px-3 py-1 font-mono text-[0.62rem] tracking-wide transition-colors',
                    filter === f.id
                      ? 'border-ms-accent bg-ms-accent-sub text-ms-accent'
                      : 'border-ms-border text-ms-txt3 hover:border-ms-border-hi hover:text-ms-txt2',
                  )}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGlossaryOpen(true)}
                className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-ms-border px-3 py-1 font-mono text-[0.62rem] tracking-wide text-ms-txt2 transition-colors hover:border-ms-accent hover:text-ms-accent"
              >
                <BookOpen className="size-3" /> Glossary
              </button>
            </div>
          </div>
        </div>

        {/* sections */}
        <div className="mt-10 flex flex-col gap-14">
          {!regionHasReports ? (
            <div className="rounded-lg border border-dashed border-ms-border py-20 text-center">
              <p className="text-[0.9rem] text-ms-txt2">
                No reports available for this region yet.
              </p>
            </div>
          ) : (
            <>
              {SECTIONS.map((section) => {
                const inSection = visible.filter((r) => r.section === section.id)
                if (inSection.length === 0) return null
                return (
                  <section key={section.id} id={section.id} className="scroll-mt-40">
                    <div className="flex flex-wrap items-baseline gap-3 border-b border-ms-border pb-4">
                      <span className="rounded-[3px] bg-ms-surface-hi px-2 py-0.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-ms-txt2">
                        {section.tag}
                      </span>
                      <h2 className="font-display text-xl font-semibold tracking-tight text-ms-txt sm:text-2xl">
                        {section.question}
                      </h2>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {inSection.map((r) => (
                        <ReportCard key={r.id} report={r} />
                      ))}
                    </div>
                  </section>
                )
              })}

              {totalMatches === 0 && (
                <div className="rounded-lg border border-dashed border-ms-border py-20 text-center">
                  <p className="text-[0.9rem] text-ms-txt2">No reports match your filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setFilter('all')
                    }}
                    className="mt-3 font-mono text-[0.72rem] text-ms-accent hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="mt-24 border-t border-ms-border pt-8">
          <p className="font-mono text-[0.62rem] leading-relaxed text-ms-txt3">
            Managed Shipping Analytics Suite · Portal rebuilt 2026-09-14 · Freshness and
            counts derived from the live report registry. Report links and live monitors are
            illustrative in this prototype.
          </p>
        </footer>
      </main>

      <GlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        reports={REPORTS}
        onSelectReport={selectReport}
      />
      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        region={region}
        reports={REPORTS}
        onSelectReport={selectReport}
      />
    </div>
  )
}

function StatChip({
  label,
  value,
  accent,
  dot,
}: {
  label: string
  value: number
  accent: string
  dot: string
}) {
  return (
    <div className="rounded-md border border-ms-border bg-ms-surface px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className={cn('size-1.5 rounded-full', dot)} />
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ms-txt3">
          {label}
        </span>
      </div>
      <p className={cn('mt-1.5 font-display text-2xl font-bold tabular-nums', accent)}>{value}</p>
    </div>
  )
}
