import { getCodes, createCode } from '@/lib/db/codes'
import { revalidatePath } from 'next/cache'
import { formatCurrency } from '@/lib/utils/formatters'

export default async function CodesPage() {
  const codes = await getCodes(true)

  async function maakCodeAan(formData: FormData) {
    'use server'
    await createCode({
      code: formData.get('code') as string,
      omschrijving: formData.get('omschrijving') as string,
      tarief: parseFloat(formData.get('tarief') as string),
    })
    revalidatePath('/codes')
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Facturatie codes</h1>

      <form action={maakCodeAan} className="grid grid-cols-3 gap-2 mb-6">
        <input name="code" placeholder="Code" required
          className="border border-gray-300 rounded px-3 py-2 text-sm" />
        <input name="omschrijving" placeholder="Omschrijving" required
          className="border border-gray-300 rounded px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input name="tarief" type="number" step="0.0001" min="0.0001" placeholder="Tarief (€)"
            required className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Toevoegen
          </button>
        </div>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Code</th>
            <th className="text-left py-2 font-medium text-gray-600">Omschrijving</th>
            <th className="text-right py-2 font-medium text-gray-600">Tarief</th>
            <th className="text-center py-2 font-medium text-gray-600">Actief</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => (
            <tr key={code.id} className={`border-b border-gray-100 ${!code.actief ? 'opacity-50' : ''}`}>
              <td className="py-2 font-mono text-xs">{code.code}</td>
              <td className="py-2">{code.omschrijving}</td>
              <td className="py-2 text-right">{formatCurrency(code.tarief)}</td>
              <td className="py-2 text-center">{code.actief ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
