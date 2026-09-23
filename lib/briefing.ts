// ── WBR Metrics Snapshot — the single source for the AI Executive TL;DR ───────
// Everything the summary says is grounded in data/briefing.json. Callouts are
// computed deterministically from the primary metrics you define, so the AI
// only rephrases them — it can never invent a number, and the feature renders
// even when the AI Gateway is unavailable (e.g. in the v0 preview).

import briefingData from '@/data/briefing.json'
import type { RegionId } from '@/lib/reports-config'

export type MetricFormat = 'pct' | 'currency' | 'number'
export type Direction = 'up' | 'down' | 'flat'
export type Sentiment = 'good' | 'bad' | 'neutral'

export interface BriefMetric {
  id: string
  label: string
  value: number
  prior: number
  format: MetricFormat
  unit?: string
  goodDirection: 'up' | 'down'
  priority: number
}

export interface RegionBrief {
  label: string
  asOf: string
  primaryMetrics: BriefMetric[]
}

export interface Callout {
  id: string
  label: string
  valueLabel: string
  deltaLabel: string
  direction: Direction
  sentiment: Sentiment
  text: string
}

interface BriefingFile {
  meta: { title: string; asOf: string; sourceReportId: string; description: string }
  regions: Record<string, RegionBrief>
}

const DATA = briefingData as BriefingFile

export const BRIEFING_TITLE = DATA.meta.title
export const BRIEFING_AS_OF = DATA.meta.asOf

export function regionBrief(region: RegionId): RegionBrief | null {
  return DATA.regions[region] ?? null
}

export function formatValue(m: Pick<BriefMetric, 'value' | 'format' | 'unit'>): string {
  if (m.format === 'pct') return `${m.value}%`
  if (m.format === 'currency') return `${m.unit ?? '$'}${m.value.toFixed(2)}`
  return m.value.toLocaleString('en-US')
}

// Turn a metric into a callout with direction, magnitude, sentiment, and a
// deterministic sentence. The AI route may replace `text` with a nicer phrasing.
export function metricToCallout(m: BriefMetric): Callout {
  const deltaAbs = m.value - m.prior
  const valueLabel = formatValue(m)

  let direction: Direction
  let deltaLabel: string
  let flat = false

  if (m.format === 'pct') {
    const mag = Math.abs(deltaAbs)
    flat = mag < 0.05
    deltaLabel = `${mag.toFixed(1)} pts`
    direction = flat ? 'flat' : deltaAbs > 0 ? 'up' : 'down'
  } else {
    const pctChange = m.prior !== 0 ? (Math.abs(deltaAbs) / Math.abs(m.prior)) * 100 : 0
    flat = pctChange < 0.5
    deltaLabel = `${pctChange.toFixed(1)}%`
    direction = flat ? 'flat' : deltaAbs > 0 ? 'up' : 'down'
  }

  const sentiment: Sentiment = flat
    ? 'neutral'
    : direction === m.goodDirection
      ? 'good'
      : 'bad'

  const text = flat
    ? `${m.label} held roughly flat week over week at ${valueLabel}.`
    : `${m.label} ${direction === 'up' ? 'rose' : 'fell'} ${deltaLabel} week over week to ${valueLabel}.`

  return { id: m.id, label: m.label, valueLabel, deltaLabel, direction, sentiment, text }
}

// The two callouts for a region: the highest-priority primary metrics.
export function computeCallouts(region: RegionId, count = 2): Callout[] {
  const brief = regionBrief(region)
  if (!brief) return []
  return [...brief.primaryMetrics]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, count)
    .map(metricToCallout)
}
