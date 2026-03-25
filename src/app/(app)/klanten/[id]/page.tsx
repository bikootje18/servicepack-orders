import { getKlant } from '@/lib/db/klanten'
import { getGiveXImports } from '@/lib/db/give-x-imports'
import { ImportDropzone } from '@/components/give-x/ImportDropzone'
import { notFound } from 'next/navigation'

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klant = await getKlant(id).catch(() => null)
  if (!klant) notFound()

  const isGiveX = klant.naam.toLowerCase().includes('give-x') || klant.naam.toLowerCase().includes('givex')
  const imports = isGiveX ? await getGiveXImports(id) : []
  const ongematchteImports = imports.filter(i => !i.order_id)
  const gematchteImports = imports.filter(i => i.order_id)

  return (
    <div className="max-w-3xl">
      {/* Koptekst */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{klant.naam}</h1>
        {klant.adres && (
          <p className="text-sm text-gray-500 mt-1">
            {[klant.adres, klant.postcode && klant.stad ? `${klant.postcode} ${klant.stad}` : (klant.postcode || klant.stad), klant.land]
              .filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Give-X imports sectie */}
      {isGiveX && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Imports</h2>

          <ImportDropzone klantId={id} />

          {/* Ongematchte imports */}
          {ongematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">
                Nog te koppelen ({ongematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Document</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {ongematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.documentnummer}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {imp.leverdatum ?? '—'}
                      </td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Gematchte imports */}
          {gematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Verwerkt ({gematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Order</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {gematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.order?.order_nummer ?? '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {imp.leverdatum ?? '—'}
                      </td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
