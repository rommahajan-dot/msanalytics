import { generateText } from 'ai'
import { buildReports, GLOSSARY, isRegion, REGIONS } from '@/lib/reports-config'

export const maxDuration = 30

export async function POST(req: Request) {
  const { question, region } = await req.json().catch(() => ({}))
  if (typeof question !== 'string' || !question.trim()) {
    return Response.json({ error: 'Missing question' }, { status: 400 })
  }
  if (!isRegion(region)) {
    return Response.json({ error: 'Unknown region' }, { status: 400 })
  }

  const regionName = REGIONS.find((r) => r.id === region)!.name
  const reports = buildReports(region)
  const catalog = reports
    .map(
      (r) =>
        `- ${r.title} [${r.status}, ${r.cadence}]: ${r.description}${
          r.sparkline.length >= 2 ? ` Series (${r.sparkLabel}): ${r.sparkline.join(', ')}.` : ''
        }`,
    )
    .join('\n')
  const glossary = GLOSSARY.map((g) => `- ${g.term}: ${g.definition}`).join('\n')

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system:
        'You are the analytics assistant for the eBay Managed Shipping Analytics Suite. Answer questions about which report answers a given business question, what a metric means, and what the data currently shows. Ground every answer ONLY in the provided catalog and glossary. If the answer is not covered, say which report would answer it or that it is planned/not yet built. Be concise — 2 to 4 sentences. Name specific report titles.',
      prompt: `Region: ${regionName}.\n\nReport catalog:\n${catalog}\n\nGlossary:\n${glossary}\n\nUser question: ${question.trim()}`,
    })
    return Response.json({ answer: text.trim() })
  } catch {
    return Response.json({ error: 'Assistant unavailable' }, { status: 502 })
  }
}
