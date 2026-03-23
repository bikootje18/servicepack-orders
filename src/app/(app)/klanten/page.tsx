import { getKlanten, createKlant } from '@/lib/db/klanten'
import { revalidatePath } from 'next/cache'

export default async function KlantenPage() {
  const klanten = await getKlanten()

  async function maakKlantAan(formData: FormData) {
    'use server'
    const naam = formData.get('naam') as string
    if (naam?.trim()) {
      await createKlant(naam)
      revalidatePath('/klanten')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Klanten</h1>

      <form action={maakKlantAan} className="flex gap-2 mb-6">
        <input
          name="naam"
          placeholder="Bedrijfsnaam"
          required
          className="form-input flex-1"
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Toevoegen
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Naam</th>
          </tr>
        </thead>
        <tbody>
          {klanten.map(klant => (
            <tr key={klant.id} className="border-b border-gray-100">
              <td className="py-2">{klant.naam}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
