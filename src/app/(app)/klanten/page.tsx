import { getKlanten, createKlant } from '@/lib/db/klanten'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function KlantenPage() {
  const klanten = await getKlanten()

  async function maakKlantAan(formData: FormData) {
    'use server'
    const naam = formData.get('naam') as string
    if (naam?.trim()) {
      await createKlant({
        naam,
        adres: formData.get('adres') as string,
        postcode: formData.get('postcode') as string,
        stad: formData.get('stad') as string,
        land: formData.get('land') as string,
      })
      revalidatePath('/klanten')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Klanten</h1>

      <form action={maakKlantAan} className="space-y-3 mb-8 bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Nieuwe klant</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
          <input name="naam" required className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
          <input name="adres" placeholder="Straat en huisnummer" className="form-input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
            <input name="postcode" className="form-input" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
            <input name="stad" className="form-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
          <input name="land" placeholder="bijv. Nederland" className="form-input" />
        </div>
        <button type="submit" className="btn-primary">
          Klant toevoegen
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Naam</th>
            <th className="text-left py-2 font-medium text-gray-600">Adres</th>
          </tr>
        </thead>
        <tbody>
          {klanten.map(klant => (
            <tr key={klant.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 font-medium">
                <Link href={`/klanten/${klant.id}`} className="hover:underline">
                  {klant.naam}
                </Link>
              </td>
              <td className="py-2 text-gray-500 text-xs">
                {[klant.adres, klant.postcode && klant.stad ? `${klant.postcode} ${klant.stad}` : (klant.postcode || klant.stad), klant.land]
                  .filter(Boolean).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
