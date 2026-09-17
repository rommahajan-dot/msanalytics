// ── Managed Shipping Analytics Suite — dynamic report taxonomy ──────────────
// A mock "schema" standing in for what would be Vercel Edge Config / a DB table.
// Everything the UI renders (cards, counts, freshness, glossary) is derived
// from this module so the portal stays a single source of truth.

export type RegionId = 'us' | 'uk' | 'de' | 'global'
export type ReportStatus = 'live' | 'fresh' | 'stale' | 'planned'
export type ReportType = 'static' | 'live' | 'sql'
export type CategoryId = 'wbr' | 'funnel' | 'expansion' | 'loss' | 'live'

export interface Region {
  id: RegionId
  label: string
  name: string
}

export interface CategoryDef {
  id: CategoryId
  tag: string
  question: string // may contain {REGION}
}

export interface HistoryLink {
  date: string
  url: string
}

export interface Report {
  id: string
  region: RegionId
  questionCategory: CategoryId
  title: string
  description: string
  status: ReportStatus
  type: ReportType
  cadence: string
  generatedAt: string | null // ISO date, null when not built
  reportUrl: string | null
  sqlSnippet: string | null
  historyLinks: HistoryLink[]
  sparkline: number[]
  sparkLabel: string
}

export interface GlossaryTerm {
  term: string
  definition: string
  formula?: string
  relatedReportIds: string[]
}

// The "as of" date the portal was rebuilt — freshness is computed relative to it.
export const PORTAL_DATE = '2026-09-14'

export const REGIONS: Region[] = [
  { id: 'us', label: 'US', name: 'United States' },
  { id: 'uk', label: 'UK', name: 'United Kingdom' },
  { id: 'de', label: 'DE', name: 'Germany' },
  { id: 'global', label: 'Global', name: 'Global' },
]

export const CATEGORIES: CategoryDef[] = [
  { id: 'wbr', tag: 'WBR', question: 'What happened in Managed Shipping this week?' },
  {
    id: 'funnel',
    tag: 'Funnel',
    question: 'Where does order-to-label conversion break down?',
  },
  {
    id: 'expansion',
    tag: 'Expansion',
    question: 'How is the {REGION} expansion of Managed Shipping progressing?',
  },
  { id: 'loss', tag: 'Loss & Cost', question: 'Where is Managed Shipping losing money?' },
  {
    id: 'live',
    tag: 'Live',
    question: 'What is happening in Managed Shipping right now?',
  },
]

// ── SQL templates ───────────────────────────────────────────────────────────
const sql = (region: string, body: string) => body.replaceAll('{REGION}', region)

const SQL = {
  wbr: `SELECT rtl_week_id,
       COUNT(DISTINCT order_id)                         AS orders,
       COUNT(DISTINCT label_id)                         AS labels,
       SAFE_DIVIDE(COUNT(DISTINCT label_id),
                   COUNT(DISTINCT order_id))            AS attach_rate,
       SUM(gmv_usd)                                     AS gmv
FROM   managed_shipping.fact_labels
WHERE  region = '{REGION}'
  AND  is_local = FALSE
  AND  checkout_status <> 3
  AND  age_for_rtl_week_id BETWEEN -12 AND -3
GROUP  BY rtl_week_id
ORDER  BY rtl_week_id DESC;`,
  funnel: `WITH steps AS (
  SELECT order_id,
         MAX(created_flag)      AS step_created,
         MAX(eligible_flag)     AS step_eligible,
         MAX(rate_shown_flag)   AS step_rate_shown,
         MAX(label_bought_flag) AS step_label
  FROM   managed_shipping.funnel_events
  WHERE  region = '{REGION}' AND is_local = FALSE
  GROUP  BY order_id
)
SELECT SUM(step_created)   AS created,
       SUM(step_eligible)  AS eligible,
       SUM(step_rate_shown) AS rate_shown,
       SUM(step_label)     AS label_bought
FROM   steps;`,
  waterfall: `SELECT gate_name,
       COUNT(DISTINCT seller_id) AS sellers,
       COUNT(DISTINCT order_id)  AS orders,
       COUNT(DISTINCT fnl_id)    AS fnls
FROM   managed_shipping.eligibility_waterfall
WHERE  region = '{REGION}'
  AND  is_local = FALSE
  AND  checkout_status <> 3
GROUP  BY gate_name, gate_order
ORDER  BY gate_order;`,
  expansion: `SELECT enroll_week_id,
       geo_region,
       COUNT(DISTINCT seller_id) AS sellers_enrolled,
       COUNT(DISTINCT label_id)  AS labels,
       SUM(gmv_usd)              AS gmv
FROM   managed_shipping.expansion_cohorts
WHERE  region = '{REGION}'
GROUP  BY enroll_week_id, geo_region
ORDER  BY enroll_week_id DESC;`,
  vi: `SELECT vi_category,
       COUNT(DISTINCT order_id)  AS eligible_orders,
       COUNT(DISTINCT label_id)  AS labels,
       SAFE_DIVIDE(COUNT(DISTINCT label_id),
                   COUNT(DISTINCT order_id)) AS attach_rate
FROM   managed_shipping.expansion_vi_funnel
WHERE  region = '{REGION}' AND is_local = FALSE
GROUP  BY vi_category
ORDER  BY eligible_orders DESC;`,
  gplt: `SELECT carrier,
       zone,
       seller_segment,
       SUM(carrier_charge_usd)                    AS paid_to_carrier,
       SUM(seller_recovery_usd)                   AS recovered,
       SUM(carrier_charge_usd - seller_recovery_usd) AS shortpaid_loss
FROM   managed_shipping.gplt_reconciliation
WHERE  region = '{REGION}'
GROUP  BY carrier, zone, seller_segment
HAVING shortpaid_loss > 0
ORDER  BY shortpaid_loss DESC;`,
  losses: `SELECT loss_reason,          -- lost_in_transit | arrived_damaged | return
       carrier,
       COUNT(DISTINCT claim_id)  AS claims,
       SUM(claim_amount_usd)     AS loss_usd
FROM   managed_shipping.loss_events
WHERE  region = '{REGION}'
  AND  event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP  BY loss_reason, carrier
ORDER  BY loss_usd DESC;`,
  m2m: `SELECT DATE_TRUNC(label_ts, HOUR) AS hour,
       COUNT(DISTINCT label_id)      AS labels,
       COUNT(DISTINCT seller_id)     AS active_sellers,
       zone,
       carrier
FROM   managed_shipping.m2m_live
WHERE  region = '{REGION}'
  AND  label_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP  BY hour, zone, carrier
ORDER  BY hour DESC;`,
}

// ── Base report definitions (US canonical) ──────────────────────────────────
interface BaseDef {
  id: string
  category: CategoryId
  title: string // may contain {REGION}
  description: string
  status: ReportStatus
  type: ReportType
  cadence: string
  generatedAt: string | null
  urlBase: string | null
  externalUrl?: string
  sqlKey?: keyof typeof SQL
  history: string[]
  sparkline: number[]
  sparkLabel: string
  // per-region status overrides so each region reads differently
  regionStatus?: Partial<Record<RegionId, ReportStatus>>
}

const BASE: BaseDef[] = [
  {
    id: 'wbr',
    category: 'wbr',
    title: 'Weekly Business Review',
    description:
      'GMV, label volumes, attach rate, carrier mix, and seller-level anomalies. Week-over-week and year-over-year comparisons across the full managed shipping program.',
    status: 'fresh',
    type: 'static',
    cadence: 'Weekly',
    generatedAt: '2026-09-07',
    urlBase: 'WBR',
    sqlKey: 'wbr',
    history: ['2026-08-31', '2026-08-24'],
    sparkline: [812, 903, 878, 951, 1002, 1044, 1090, 1137],
    sparkLabel: 'Weekly label volume (k)',
  },
  {
    id: 'wbr-bau',
    category: 'wbr',
    title: 'WBR — BAU Baseline',
    description:
      'Counterfactual view showing the same metrics absent experiment treatment — isolates the incremental effect of managed shipping changes from underlying market movement.',
    status: 'fresh',
    type: 'static',
    cadence: 'Weekly',
    generatedAt: '2026-09-07',
    urlBase: 'WBR-BAU',
    sqlKey: 'wbr',
    history: [],
    sparkline: [800, 815, 822, 831, 845, 858, 869, 880],
    sparkLabel: 'BAU baseline volume (k)',
  },
  {
    id: 'order-to-label-funnel',
    category: 'funnel',
    title: 'Order-to-Label Funnel',
    description:
      'Step-by-step conversion from order creation through label purchase — broken down by seller cohort, zone, item category, and carrier eligibility.',
    status: 'fresh',
    type: 'static',
    cadence: 'Ad-hoc',
    generatedAt: '2026-09-08',
    urlBase: 'MS-Order-to-Label-Funnel',
    sqlKey: 'funnel',
    history: [],
    sparkline: [100, 88, 74, 61, 58, 55, 52, 49],
    sparkLabel: 'Conversion by step (%)',
  },
  {
    id: 'eligibility-waterfall',
    category: 'funnel',
    title: 'Eligibility Waterfall',
    description:
      'Total C2C sellers/orders/FNLs stepped down through each eligibility gate — ramp, category, price point, weight, prohibited items, and more — to the final MS eligible population.',
    status: 'fresh',
    type: 'static',
    cadence: 'Weekly',
    generatedAt: '2026-09-14',
    urlBase: 'MS-Eligibility-Waterfall',
    sqlKey: 'waterfall',
    history: [],
    sparkline: [100, 92, 81, 70, 58, 47, 39, 33],
    sparkLabel: 'Population through gates (%)',
    regionStatus: { de: 'planned' },
  },
  {
    id: 'seller-funnel-cohort',
    category: 'funnel',
    title: 'Seller Funnel Cohort',
    description:
      'Longitudinal funnel by seller vintage — whether newly enrolled sellers improve conversion over time, or churn at the label purchase step.',
    status: 'planned',
    type: 'static',
    cadence: 'Planned',
    generatedAt: null,
    urlBase: null,
    history: [],
    sparkline: [],
    sparkLabel: '',
  },
  {
    id: 'expansion',
    category: 'expansion',
    title: '{REGION} Expansion Analysis',
    description:
      'Geographic rollout progress, seller adoption by region, volume ramp, and week-over-week expansion velocity across newly enrolled cohorts.',
    status: 'fresh',
    type: 'static',
    cadence: 'Weekly',
    generatedAt: '2026-09-07',
    urlBase: 'MS-Expansion',
    sqlKey: 'expansion',
    history: ['2026-08-31'],
    sparkline: [120, 180, 265, 360, 470, 590, 705, 838],
    sparkLabel: 'Sellers enrolled (cumulative)',
  },
  {
    id: 'expansion-vi',
    category: 'expansion',
    title: 'Expansion — VI Funnel',
    description:
      'Variant item (VI) eligibility and label attachment within the expansion cohort — tracks which VI categories are converting vs. where the rate lags the BAU funnel.',
    status: 'fresh',
    type: 'static',
    cadence: 'Ad-hoc',
    generatedAt: '2026-09-07',
    urlBase: 'MS-Expansion-VI',
    sqlKey: 'vi',
    history: [],
    sparkline: [41, 44, 43, 47, 49, 52, 51, 55],
    sparkLabel: 'VI attach rate (%)',
  },
  {
    id: 'seller-adoption-health',
    category: 'expansion',
    title: 'Seller Adoption Health',
    description:
      'Active vs. dormant vs. churned sellers by enrollment week. Tracks attach rate by cohort vintage and surfaces early warning signals for at-risk accounts.',
    status: 'planned',
    type: 'static',
    cadence: 'Planned',
    generatedAt: null,
    urlBase: null,
    history: [],
    sparkline: [],
    sparkLabel: '',
  },
  {
    id: 'gplt-shortpaid',
    category: 'loss',
    title: 'GPLT Shortpaid Analysis',
    description:
      'Ground Parcel LTL cases where eBay paid carrier charges but recovered less from sellers. Loss by carrier, zone, seller segment, and item type.',
    status: 'fresh',
    type: 'static',
    cadence: 'Ad-hoc',
    generatedAt: '2026-09-09',
    urlBase: 'GPLT-Shortpaid',
    sqlKey: 'gplt',
    history: [],
    sparkline: [64, 71, 68, 77, 73, 81, 88, 84],
    sparkLabel: 'Weekly shortpaid loss ($k)',
    regionStatus: { uk: 'stale' },
  },
  {
    id: 'ms-losses-tracker',
    category: 'loss',
    title: 'MS Losses Tracker',
    description:
      'Rolling tracker of lost-in-transit, arrived-damaged, and returns losses. SQL is ready in the repo — the HTML report has not yet been generated.',
    status: 'stale',
    type: 'sql',
    cadence: 'SQL only',
    generatedAt: null,
    urlBase: null,
    sqlKey: 'losses',
    history: [],
    sparkline: [22, 26, 24, 29, 31, 28, 33, 30],
    sparkLabel: 'Loss events (weekly)',
  },
  {
    id: 'unit-economics-cogs',
    category: 'loss',
    title: 'Unit Economics / COGS',
    description:
      'Cost per label by carrier and zone: postage cost, eBay subsidy, seller recovery, and net margin. Replaces ad-hoc pulls from 03-Finance-COGS.',
    status: 'planned',
    type: 'static',
    cadence: 'Planned',
    generatedAt: null,
    urlBase: null,
    history: [],
    sparkline: [],
    sparkLabel: '',
  },
  {
    id: 'm2m-insights',
    category: 'live',
    title: 'M2M Insights Monitor',
    description:
      'Live operational dashboard for Managed-to-Managed shipping: real-time label rates, seller activity, zone distribution, and carrier routing — queried fresh on every load.',
    status: 'live',
    type: 'live',
    cadence: 'On demand',
    generatedAt: null,
    urlBase: null,
    externalUrl: 'https://m2minsights-m2minsights.vip.ebay.com/',
    sqlKey: 'm2m',
    history: [],
    sparkline: [58, 62, 55, 71, 66, 74, 69, 78],
    sparkLabel: 'Labels / min (last 8h)',
    regionStatus: { de: 'planned' },
  },
  {
    id: 'carrier-performance-monitor',
    category: 'live',
    title: 'Carrier Performance Monitor',
    description:
      'Live cost-per-zone, on-time delivery rates, and routing efficiency — flags carriers where Managed Shipping is running above-target cost relative to benchmark.',
    status: 'planned',
    type: 'live',
    cadence: 'Planned',
    generatedAt: null,
    urlBase: null,
    history: [],
    sparkline: [],
    sparkLabel: '',
  },
]

// Days to shift generation dates per region so freshness reads differently.
const REGION_DATE_OFFSET: Record<RegionId, number> = {
  us: 0,
  uk: -2,
  de: -4,
  global: 0,
}
// Multiply sparkline magnitudes so each region has its own scale.
const REGION_SCALE: Record<RegionId, number> = {
  us: 1,
  uk: 0.42,
  de: 0.31,
  global: 1.9,
}

function shiftDate(iso: string | null, days: number): string | null {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function scaleSpark(spark: number[], factor: number): number[] {
  return spark.map((v) => Math.round(v * factor))
}

export function buildReports(region: RegionId): Report[] {
  const label = REGIONS.find((r) => r.id === region)!.label
  const offset = REGION_DATE_OFFSET[region]
  const scale = REGION_SCALE[region]
  // percentage-style sparklines (funnel/vi) should not be scaled
  const pctReports = new Set(['order-to-label-funnel', 'eligibility-waterfall', 'expansion-vi'])

  return BASE.map((b): Report => {
    const status = b.regionStatus?.[region] ?? b.status
    const generatedAt = shiftDate(b.generatedAt, offset)
    const title = b.title.replaceAll('{REGION}', label)
    const reportUrl =
      b.externalUrl ??
      (b.urlBase && generatedAt && status !== 'planned' && status !== 'stale'
        ? `${b.urlBase}-${generatedAt.replaceAll('-', '')}.html`
        : null)
    const sqlSnippet = b.sqlKey ? sql(label, SQL[b.sqlKey]) : null
    const sparkline =
      status === 'planned'
        ? []
        : pctReports.has(b.id)
          ? b.sparkline
          : scaleSpark(b.sparkline, scale)

    return {
      id: b.id,
      region,
      questionCategory: b.category,
      title,
      description: b.description,
      status,
      type: b.type,
      cadence: b.cadence,
      generatedAt,
      reportUrl,
      sqlSnippet: status === 'planned' ? null : sqlSnippet,
      historyLinks:
        status === 'planned' || status === 'stale'
          ? []
          : b.history.map((date) => ({
              date: shiftDate(date, offset)!,
              url: b.urlBase
                ? `${b.urlBase}-${shiftDate(date, offset)!.replaceAll('-', '')}.html`
                : '#',
            })),
      sparkline,
      sparkLabel: b.sparkLabel,
    }
  })
}

// ── Glossary ─────────────────────────────────────────────────────────────────
export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Orders',
    definition:
      'Distinct count of orders. The base denominator for attach-rate and funnel calculations across every report in the portal.',
    formula: 'COUNT(DISTINCT order_id)',
    relatedReportIds: ['wbr', 'order-to-label-funnel', 'eligibility-waterfall'],
  },
  {
    term: 'Attach Rate',
    definition:
      'Share of eligible orders that resulted in a Managed Shipping label purchase. Headline conversion metric for the funnel.',
    formula: 'COUNT(DISTINCT label_id) / COUNT(DISTINCT order_id)',
    relatedReportIds: ['wbr', 'wbr-bau', 'expansion-vi', 'order-to-label-funnel'],
  },
  {
    term: 'Label Maturity Window',
    definition:
      'Rows are restricted to the window where label outcomes are settled, preventing recent, still-maturing weeks from distorting rates.',
    formula: 'AGE_FOR_RTL_WEEK_ID BETWEEN −12 AND −3',
    relatedReportIds: ['wbr', 'eligibility-waterfall'],
  },
  {
    term: 'IS_LOCAL',
    definition:
      'Local pickup / local delivery orders are excluded from all Managed Shipping metrics — they never enter the labeling funnel.',
    formula: 'IS_LOCAL = FALSE',
    relatedReportIds: ['wbr', 'order-to-label-funnel', 'gplt-shortpaid'],
  },
  {
    term: 'CHECKOUT_STATUS',
    definition:
      'Incomplete / cancelled checkouts (status 3) are removed so the funnel only counts genuinely placed orders.',
    formula: 'CHECKOUT_STATUS <> 3',
    relatedReportIds: ['wbr', 'eligibility-waterfall'],
  },
  {
    term: 'GPLT Shortpaid',
    definition:
      'Ground Parcel LTL shipments where the carrier charge eBay paid exceeded the amount recovered from the seller — a direct loss.',
    formula: 'carrier_charge_usd − seller_recovery_usd > 0',
    relatedReportIds: ['gplt-shortpaid', 'ms-losses-tracker'],
  },
  {
    term: 'VI (Variant Item)',
    definition:
      'Listings with size/color/style variants. Tracked separately because their eligibility and attach behavior differ from single-SKU items.',
    relatedReportIds: ['expansion-vi'],
  },
  {
    term: 'BAU Baseline',
    definition:
      'Business-as-usual counterfactual: the same metrics computed as if no experiment treatment were applied, isolating incremental impact.',
    relatedReportIds: ['wbr-bau'],
  },
  {
    term: 'M2M',
    definition:
      'Managed-to-Managed shipping — orders flowing entirely through eBay-managed carrier relationships end to end.',
    relatedReportIds: ['m2m-insights'],
  },
  {
    term: 'FNL',
    definition:
      'Final listing — a listing that reached a terminal, purchasable state and is counted in eligibility-waterfall denominators.',
    formula: 'COUNT(DISTINCT fnl_id)',
    relatedReportIds: ['eligibility-waterfall'],
  },
]

// ── Derived helpers ──────────────────────────────────────────────────────────
export function categoryQuestion(cat: CategoryDef, region: RegionId): string {
  const label = REGIONS.find((r) => r.id === region)!.label
  return cat.question.replaceAll('{REGION}', label)
}

export interface PortalStats {
  reports: number
  live: number
  planned: number
  stale: number
  fresh: number
}

export function portalStats(reports: Report[]): PortalStats {
  return {
    reports: reports.length,
    live: reports.filter((r) => r.status === 'live').length,
    planned: reports.filter((r) => r.status === 'planned').length,
    stale: reports.filter((r) => r.status === 'stale').length,
    fresh: reports.filter((r) => r.status === 'fresh').length,
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

export const STATUS_META: Record<
  ReportStatus,
  { label: string; badgeLabel: string }
> = {
  fresh: { label: 'Current', badgeLabel: 'Current' },
  stale: { label: 'No report', badgeLabel: '⚠ No Report' },
  live: { label: 'Live', badgeLabel: '● Live' },
  planned: { label: 'Planned', badgeLabel: 'Planned' },
}
