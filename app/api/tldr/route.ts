import { generateText } from 'ai'
import { isRegion, REGIONS } from '@/lib/reports-config'
import { BRIEFING_AS_OF, computeCallouts, regionBrief } from '@/lib/briefing'

export const maxDuration = 30

export async function POST(req: Request) {
  const { region } = await req.json().catch(() => ({}))
  if (!isRegion(region)) {
    return Response.json({ error: 'Unknown region' }, { status: 400 })
  }

  const regionName = REGIONS.find((r) => r.id === region)!.name
  const brief = regionBrief(region)

  // Callouts are computed deterministically from the WBR metrics snapshot, so
  // the payload is valid even without the AI Gateway. The model only rephrases.
  const callouts = computeCallouts(region, 2)
  const asOf = brief?.asOf ?? BRIEFING_AS_OF

  if (callouts.length === 0) {
    return Response.json({ callouts: [], asOf })
  }

  const facts = callouts
    .map(
      (c, i) =>
        `${i + 1}. ${c.label}: now ${c.valueLabel}, ${
          c.direction === 'flat' ? 'roughly flat' : `${c.direction} ${c.deltaLabel}`
        } week over week (${c.sentiment === 'good' ? 'favorable' : c.sentiment === 'bad' ? 'needs attention' : 'neutral'}).`,
    )
    .join('\n')

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system:
        'You are the analytics lead for eBay Managed Shipping. Rephrase each provided metric fact into one crisp, executive-ready callout. Use ONLY the numbers given — never invent metrics or values. Each line must be under 22 words, plain and direct.',
      prompt: `Region: ${regionName} (week ending ${asOf}).\n\nMetric facts from the Weekly Business Review snapshot:\n${facts}\n\nReturn exactly ${callouts.length} callouts, one per line, in the same order as the facts, no numbering or preamble.`,
    })

    const lines = text
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean)

    if (lines.length >= callouts.length) {
      callouts.forEach((c, i) => {
        c.text = lines[i]
      })
    }
  } catch {
    // Keep the deterministic sentences already on each callout.
  }

  return Response.json({ callouts, asOf })
}
