import { generateText } from 'ai'
import { isRegion, REGIONS, reportsForRegion } from '@/lib/reports-config'

export const maxDuration = 30

export async function POST(req: Request) {
  const { region } = await req.json().catch(() => ({}))
  if (!isRegion(region)) {
    return Response.json({ error: 'Unknown region' }, { status: 400 })
  }

  const regionName = REGIONS.find((r) => r.id === region)!.name
  // The executive TL;DR is grounded in the Weekly Business Review — the flagship
  // performance report. Fall back to the region's full catalog only if a region
  // has no WBR report of its own.
  const regionReports = reportsForRegion(region)
  const wbrReports = regionReports.filter((r) => r.section === 'wbr')
  const reports = wbrReports.length > 0 ? wbrReports : regionReports
  const context = reports
    .map((r) => {
      const trend =
        r.sparkline.length >= 2
          ? ` Recent series (${r.sparkLabel}): ${r.sparkline.join(', ')}.`
          : ''
      return `- ${r.name} — status: ${r.status}, cadence: ${r.cadence}. ${r.description}${trend}`
    })
    .join('\n')

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system:
        'You are the analytics lead for eBay Managed Shipping. Write terse, executive-ready takeaways for a data portal. Use concrete directional language grounded ONLY in the report list and its numeric series. Never invent metrics that are not present. Each takeaway is one sentence, under 24 words.',
      prompt: `Region: ${regionName}.\n\nWeekly Business Review reports:\n${context}\n\nReturn exactly 3 to 4 key takeaways summarizing this week's Managed Shipping performance for this region, based on the Weekly Business Review — highlight notable trends in the numeric series, momentum week over week, and where attention is needed. Output ONLY the takeaways, one per line, no numbering, no preamble.`,
    })

    const takeaways = text
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 4)

    if (takeaways.length === 0) throw new Error('empty')
    return Response.json({ takeaways })
  } catch {
    return Response.json({ error: 'Summary unavailable' }, { status: 502 })
  }
}
