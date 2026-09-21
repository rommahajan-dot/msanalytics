import { generateText } from 'ai'
import { isRegion, REGIONS, reportsForRegion } from '@/lib/reports-config'

export const maxDuration = 30

export async function POST(req: Request) {
  const { region } = await req.json().catch(() => ({}))
  if (!isRegion(region)) {
    return Response.json({ error: 'Unknown region' }, { status: 400 })
  }

  const regionName = REGIONS.find((r) => r.id === region)!.name
  const reports = reportsForRegion(region)
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
      prompt: `Region: ${regionName}.\n\nReport catalog:\n${context}\n\nReturn exactly 3 to 4 key takeaways summarizing the current state of Managed Shipping analytics for this region — highlight notable trends in the numeric series, what is current vs. planned, and where attention is needed. Output ONLY the takeaways, one per line, no numbering, no preamble.`,
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
