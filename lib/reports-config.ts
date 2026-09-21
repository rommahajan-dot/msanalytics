// ── Managed Shipping Analytics Suite — data loaded from data/reports.json ─────
// Everything the UI renders (cards, sections, counts, freshness, glossary) is
// derived from reports.json, so the portal stays a single source of truth.

import reportsData from '@/data/reports.json'

export type RegionId = 'global' | 'us' | 'uk' | 'de' | 'fr' | 'it' | 'au'
export type SectionId = 'wbr' | 'funnel' | 'expansion' | 'loss_cost' | 'live'
export type ReportStatus = 'Current' | 'Planned' | 'Live'

export interface Region {
  id: RegionId
  label: string
  name: string
}

export interface SectionDef {
  id: SectionId
  tag: string
  question: string
}

export interface HistoryLink {
  date: string
  url: string
}

export interface Report {
  id: string
  section: SectionId
  region: RegionId
  name: string
  description: string
  status: ReportStatus
  cadence: string
  generatedDate: string | null
  latestUrl: string | null
  history: HistoryLink[]
  sparkline: number[]
  sparkLabel: string
}

export interface GlossaryTerm {
  term: string
  definition: string
  note?: string
  relatedReportIds: string[]
}

interface ReportsFile {
  meta: {
    portalName: string
    portalDate: string
    glossary: GlossaryTerm[]
  }
  reports: Report[]
}

const DATA = reportsData as ReportsFile

// ── Public data ───────────────────────────────────────────────────────────────
export const PORTAL_NAME = DATA.meta.portalName
export const PORTAL_DATE = DATA.meta.portalDate
export const REPORTS: Report[] = DATA.reports
export const GLOSSARY: GlossaryTerm[] = DATA.meta.glossary

// Global is leftmost and the default selection.
export const REGIONS: Region[] = [
  { id: 'global', label: 'Global', name: 'Global' },
  { id: 'us', label: 'US', name: 'United States' },
  { id: 'uk', label: 'UK', name: 'United Kingdom' },
  { id: 'de', label: 'DE', name: 'Germany' },
  { id: 'fr', label: 'FR', name: 'France' },
  { id: 'it', label: 'IT', name: 'Italy' },
  { id: 'au', label: 'AU', name: 'Australia' },
]

export const SECTIONS: SectionDef[] = [
  {
    id: 'wbr',
    tag: 'WBR & Dashboards',
    question: 'How is Managed Shipping performing, and what happened this week?',
  },
  {
    id: 'funnel',
    tag: 'Funnel',
    question: 'Where does order-to-label conversion break down?',
  },
  {
    id: 'expansion',
    tag: 'Expansion',
    question: 'How is the geographic expansion of Managed Shipping progressing?',
  },
  {
    id: 'loss_cost',
    tag: 'Loss & Cost',
    question: 'Where is Managed Shipping losing money?',
  },
  {
    id: 'live',
    tag: 'Live',
    question: 'What is happening in Managed Shipping right now?',
  },
]

// ── Derived helpers ─────────────────────────────────────────────────────────
// The "Global" tab shows every report; any other tab shows only its region.
export function reportsForRegion(region: RegionId): Report[] {
  if (region === 'global') return REPORTS
  return REPORTS.filter((r) => r.region === region)
}

export interface PortalStats {
  reports: number
  current: number
  live: number
  planned: number
}

export function portalStats(reports: Report[]): PortalStats {
  return {
    reports: reports.length,
    current: reports.filter((r) => r.status === 'Current').length,
    live: reports.filter((r) => r.status === 'Live').length,
    planned: reports.filter((r) => r.status === 'Planned').length,
  }
}

export function daysAgo(iso: string, from: string = PORTAL_DATE): number {
  const a = new Date(iso + 'T00:00:00Z').getTime()
  const b = new Date(from + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86_400_000)
}

export function ageLabel(iso: string | null): string {
  if (!iso) return ''
  const n = daysAgo(iso)
  if (n <= 0) return 'Today'
  if (n === 1) return 'Yesterday'
  return `${n} days ago`
}

export function isRegion(x: string): x is RegionId {
  return REGIONS.some((r) => r.id === x)
}

export const STATUS_META: Record<ReportStatus, { label: string; badgeLabel: string }> = {
  Current: { label: 'Current', badgeLabel: 'Current' },
  Live: { label: 'Live', badgeLabel: '● Live' },
  Planned: { label: 'Planned', badgeLabel: 'Planned' },
}
