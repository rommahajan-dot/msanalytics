'use client'

import { REGIONS, type RegionId } from '@/lib/reports-config'
import { cn } from '@/lib/utils'

export function RegionSwitcher({
  region,
  onRegionChange,
}: {
  region: RegionId
  onRegionChange: (r: RegionId) => void
}) {
  return (
    <div
      role="group"
      aria-label="Region"
      className="flex items-center gap-0.5 rounded-md border border-ms-border bg-ms-surface p-0.5"
    >
      {REGIONS.map((r) => {
        const active = r.id === region
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onRegionChange(r.id)}
            aria-pressed={active}
            className={cn(
              'rounded-[5px] px-2.5 py-1 font-mono text-[0.66rem] font-medium tracking-wide transition-colors',
              active
                ? 'bg-ms-accent text-white'
                : 'text-ms-txt3 hover:text-ms-txt2',
            )}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
