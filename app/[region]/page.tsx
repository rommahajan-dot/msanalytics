import { notFound } from 'next/navigation'
import { Portal } from '@/components/portal'
import { buildReports, isRegion, REGIONS } from '@/lib/reports-config'

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.id }))
}

export function generateMetadata({ params }: { params: Promise<{ region: string }> }) {
  return params.then(({ region }) => {
    const r = REGIONS.find((x) => x.id === region)
    return {
      title: r
        ? `Managed Shipping ${r.label} · Analytics Suite`
        : 'Managed Shipping Analytics Suite',
    }
  })
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region } = await params
  if (!isRegion(region)) notFound()
  const reports = buildReports(region)
  return <Portal region={region} reports={reports} />
}
