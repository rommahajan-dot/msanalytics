'use client'

import { Command, Search } from 'lucide-react'
import type { RegionId } from '@/lib/reports-config'
import { RegionSwitcher } from '@/components/region-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV = [
  { href: '#wbr', label: 'WBR & Dashboards' },
  { href: '#funnel', label: 'Funnel' },
  { href: '#deep_dives', label: 'Deep Dives & Tools' },
]

export function SiteHeader({
  region,
  onRegionChange,
  onOpenCommand,
  onOpenGlossary,
}: {
  region: RegionId
  onRegionChange: (r: RegionId) => void
  onOpenCommand: () => void
  onOpenGlossary: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-ms-border bg-ms-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[54px] max-w-[1140px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="font-brand text-[0.9rem] font-bold tracking-tight text-ms-txt">
            Managed Shipping
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ms-txt3">
            Analytics Suite
          </span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[0.78rem] font-medium text-ms-txt2 transition-colors hover:text-ms-txt"
            >
              {n.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenGlossary}
            className="text-[0.78rem] font-semibold text-ms-accent transition-colors hover:opacity-80"
          >
            Glossary →
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCommand}
            aria-label="Open command menu"
            className="flex items-center gap-2 rounded-md border border-ms-border bg-ms-surface px-2.5 py-1.5 text-ms-txt3 transition-colors hover:border-ms-border-hi hover:text-ms-txt2"
          >
            <Search className="size-3.5" />
            <span className="hidden font-mono text-[0.66rem] sm:inline">Ask</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-ms-border px-1 py-0.5 font-mono text-[0.6rem] sm:inline-flex">
              <Command className="size-2.5" />
              K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* region tabs */}
      <div className="border-t border-ms-border bg-ms-bg/60">
        <div className="mx-auto flex max-w-[1140px] items-center gap-3 overflow-x-auto px-5 py-2 sm:px-8">
          <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ms-txt3">
            Region
          </span>
          <RegionSwitcher region={region} onRegionChange={onRegionChange} />
        </div>
      </div>
    </header>
  )
}
