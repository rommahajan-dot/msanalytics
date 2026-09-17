'use client'

import { Command, Search } from 'lucide-react'
import { REGIONS, type RegionId } from '@/lib/reports-config'
import { RegionSwitcher } from '@/components/region-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV = [
  { href: '#wbr', label: 'WBR' },
  { href: '#funnel', label: 'Funnel' },
  { href: '#expansion', label: 'Expansion' },
  { href: '#loss', label: 'Loss & Cost' },
  { href: '#live', label: 'Live' },
]

export function SiteHeader({
  region,
  onOpenCommand,
  onOpenGlossary,
}: {
  region: RegionId
  onOpenCommand: () => void
  onOpenGlossary: () => void
}) {
  const label = REGIONS.find((r) => r.id === region)!.label

  return (
    <header className="sticky top-0 z-40 border-b border-ms-border bg-ms-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[54px] max-w-[1140px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="font-brand text-[0.9rem] font-bold tracking-tight text-ms-txt">
            Managed Shipping {label}
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ms-txt3">
            Analytics
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
          <RegionSwitcher region={region} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
