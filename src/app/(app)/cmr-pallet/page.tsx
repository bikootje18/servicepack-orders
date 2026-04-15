// src/app/(app)/cmr-pallet/page.tsx
import { PalletCmrForm } from '@/components/cmr-pallet/PalletCmrForm'

export default function PalletCmrPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Pallet-CMR</h1>
        <p className="text-gray-500 text-sm">Selecteer de pallets die de chauffeur heeft geladen en genereer een CMR overlay.</p>
      </div>
      <PalletCmrForm />
    </div>
  )
}
