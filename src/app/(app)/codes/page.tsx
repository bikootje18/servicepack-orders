import { getCodes, createCode } from '@/lib/db/codes'
import { revalidatePath } from 'next/cache'
import { CodeRij } from '@/components/codes/CodeRij'

export default async function CodesPage() {
  const codes = await getCodes(true)

  async function maakCodeAan(formData: FormData) {
    'use server'
    await createCode({
      code: formData.get('code') as string,
      omschrijving: formData.get('omschrijving') as string,
      tarief: parseFloat(formData.get('tarief') as string),
      eenheid: (formData.get('eenheid') as string)?.trim() || 'per stuk',
    })
    revalidatePath('/codes')
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Facturatie codes</h1>

      <form action={maakCodeAan} className="flex flex-wrap items-end gap-2 mb-6">
        <input name="code" placeholder="Code" required
          className="form-input w-36" />
        <input name="omschrijving" placeholder="Omschrijving" required
          className="form-input flex-1 min-w-[14rem]" />
        <input name="eenheid" placeholder="Per (bijv. per fles, per 6, per doos)"
          className="form-input w-52" />
        <input name="tarief" type="number" step="any" min="0" placeholder="Tarief (€)"
          required className="form-input w-40" />
        <button type="submit" className="btn-primary">
          Toevoegen
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Code</th>
            <th className="text-left py-2 font-medium text-gray-600">Omschrijving</th>
            <th className="text-right py-2 font-medium text-gray-600">Tarief</th>
            <th className="text-left py-2 font-medium text-gray-600 pl-3">Per</th>
            <th className="text-center py-2 font-medium text-gray-600">Actief</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => (
            <CodeRij key={code.id} code={code} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
