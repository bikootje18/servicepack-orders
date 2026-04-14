import Link from 'next/link'
import { getVracht } from '@/lib/db/vrachten'
import { VrachtbriefKnop } from '@/components/vrachten/VrachtbriefKnop'
import { VerwijderVrachtKnop } from '@/components/vrachten/VerwijderVrachtKnop'
import { AutoMail } from '@/components/vrachten/AutoMail'
import { CmrNotitieBewerker } from '@/components/vrachten/CmrNotitieBewerker'
import { formatDate, formatAantal, formatCurrency } from '@/lib/utils/formatters'

function berekenCmrTekst(l: {
  aantal_geleverd: number
  tht: string | null
  order: { aantal_per_pallet: number; aantal_per_inner: number; aantal_per_doos: number } | null | undefined
}): string {
  const o = l.order
  if (!o) return `${l.aantal_geleverd.toLocaleString('nl-NL')} verpakkingen`

  const tht = l.tht ? `   THT ${l.tht.split('-').reverse().join('.')}` : ''
  const regels: string[] = []
  let rest = l.aantal_geleverd

  if (o.aantal_per_pallet > 0 && o.aantal_per_doos > 0) {
    const productenPerPallet = o.aantal_per_pallet * o.aantal_per_doos
    const n = Math.floor(rest / productenPerPallet)
    if (n > 0) { regels.push(`${n} pallet${n !== 1 ? 's' : ''} a ${productenPerPallet.toLocaleString('nl-NL')} = ${(n * productenPerPallet).toLocaleString('nl-NL')} verpakkingen${tht}`); rest -= n * productenPerPallet }
  }
  if (o.aantal_per_inner > 0 && rest > 0) {
    const n = Math.floor(rest / o.aantal_per_inner)
    if (n > 0) { regels.push(`${n} inner${n !== 1 ? 's' : ''} a ${o.aantal_per_inner.toLocaleString('nl-NL')} = ${(n * o.aantal_per_inner).toLocaleString('nl-NL')} verpakkingen${tht}`); rest -= n * o.aantal_per_inner }
  }
  if (o.aantal_per_doos > 0 && rest > 0) {
    const n = Math.floor(rest / o.aantal_per_doos)
    if (n > 0) { regels.push(`${n} ${n !== 1 ? 'dozen' : 'doos'} a ${o.aantal_per_doos.toLocaleString('nl-NL')} = ${(n * o.aantal_per_doos).toLocaleString('nl-NL')} verpakkingen${tht}`); rest -= n * o.aantal_per_doos }
  }
  if (rest > 0) regels.push(`${rest.toLocaleString('nl-NL')} los${tht}`)
  if (regels.length > 1) regels.push(`Totaal: ${l.aantal_geleverd.toLocaleString('nl-NL')} verpakkingen`)

  return regels.join('\n') || `${l.aantal_geleverd.toLocaleString('nl-NL')} verpakkingen`
}

export default async function VrachtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mail?: string }>
}) {
  const { id } = await params
  const { mail } = await searchParams
  const vracht = await getVracht(id)
  const regels = vracht.regels ?? []

  const totaalEenheden = regels.reduce(
    (sum, r) => sum + (r.levering?.aantal_geleverd ?? 0), 0
  )

  const totaalBedrag = regels.reduce((sum, r) => {
    const tarief = r.levering?.order?.facturatie_code?.tarief ?? 0
    return sum + tarief * (r.levering?.aantal_geleverd ?? 0)
  }, 0)

  const klantEmail = (vracht.klant as any)?.email ?? null

  const orderRegels = regels
    .filter(r => r.levering?.order)
    .map(r => `- ${r.levering!.order!.order_nummer}: ${r.levering!.aantal_geleverd.toLocaleString('nl-NL')} stuks`)
    .join('\n')

  const mailOnderwerp = encodeURIComponent(`Vracht opgehaald: ${vracht.vrachtbrief_nummer}`)
  const mailTekst = encodeURIComponent(
    `Beste,\n\nHierbij bevestigen wij dat vracht ${vracht.vrachtbrief_nummer} op ${formatDate(vracht.datum)} is opgehaald.\n\n${orderRegels}\n\nMet vriendelijke groet,\nService Pack b.v.`
  )
  const mailtoHref = `mailto:${klantEmail ?? ''}?subject=${mailOnderwerp}&body=${mailTekst}`

  return (
    <div className="max-w-4xl">
      {mail === '1' && klantEmail && <AutoMail mailtoHref={mailtoHref} />}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono mb-1">{vracht.vrachtbrief_nummer}</h1>
          <p className="text-gray-500 text-sm">
            {vracht.klant?.naam} · {formatDate(vracht.datum)}
            {vracht.aangemaakt_door && (
              <span className="ml-2 text-gray-400">· aangemaakt door {vracht.aangemaakt_door}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <VrachtbriefKnop vracht={vracht} />
          <a
            href={mailtoHref}
            className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 text-gray-700"
          >
            {klantEmail ? 'Mail klant' : 'Mail opstellen'}
          </a>
          <VerwijderVrachtKnop vrachtId={id} vrachtbriefNummer={vracht.vrachtbrief_nummer} />
        </div>
      </div>

      {vracht.notities && (
        <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          {vracht.notities}
        </p>
      )}

      <h2 className="font-semibold mb-3">Leveringen in deze vracht</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">CMR tekst</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {regels.map(r => {
            if (!r.levering) return null
            const levering = r.levering
            const tarief = levering.order?.facturatie_code?.tarief ?? 0
            const gegenereerd = berekenCmrTekst(levering as any)
            return (
              <tr key={r.id} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-4">
                  <Link
                    href={`/orders/${levering.order_id}`}
                    className="font-mono text-xs text-blue-600 hover:underline block"
                  >
                    {levering.order?.order_nummer}
                  </Link>
                  <span className="text-xs text-gray-400">{formatDate(levering.leverdatum)}</span>
                </td>
                <td className="py-2 pr-4">
                  <CmrNotitieBewerker
                    regelId={r.id}
                    vrachtId={id}
                    gegenereerd={gegenereerd}
                    opgeslagen={r.cmr_notitie ?? null}
                  />
                </td>
                <td className="py-2 text-right">{formatAantal(levering.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(tarief * levering.aantal_geleverd)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td className="py-2 font-semibold" colSpan={2}>Totaal</td>
            <td className="py-2 text-right font-semibold">{formatAantal(totaalEenheden)}</td>
            <td className="py-2 text-right font-semibold">{formatCurrency(totaalBedrag)}</td>
          </tr>
        </tfoot>
      </table>

      {vracht.factuur && (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Factuur</p>
            <Link
              href={`/facturen/${vracht.factuur.id}`}
              className="text-blue-600 hover:underline font-mono text-sm font-medium"
            >
              {vracht.factuur.factuur_nummer}
            </Link>
          </div>
          <span className="font-semibold text-gray-900">{formatCurrency(vracht.factuur.totaal_bedrag ?? 0)}</span>
        </div>
      )}
    </div>
  )
}
