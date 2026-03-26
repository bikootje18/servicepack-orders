'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveBijlage } from '@/lib/actions/bijlagen'

interface Props {
  orderId: string
}

export function BijlageUpload({ orderId }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function uploadBestanden(bestanden: FileList | null) {
    if (!bestanden || bestanden.length === 0) return
    setUploading(true)
    setFout(null)

    const supabase = createClient()

    for (const bestand of Array.from(bestanden)) {
      if (bestand.size > 20 * 1024 * 1024) {
        setFout(`${bestand.name} is groter dan 20 MB`)
        continue
      }

      const timestamp = Date.now()
      const opslagPad = `${orderId}/${timestamp}-${bestand.name}`

      const { error: uploadError } = await supabase.storage
        .from('order-bijlagen')
        .upload(opslagPad, bestand)

      if (uploadError) {
        setFout(`Upload mislukt: ${uploadError.message}`)
        continue
      }

      await saveBijlage({
        order_id: orderId,
        bestandsnaam: bestand.name,
        opslag_pad: opslagPad,
        bestandsgrootte: bestand.size,
        mime_type: bestand.type,
      })
    }

    setUploading(false)
    router.refresh()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    uploadBestanden(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className="border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? '#2563eb' : '#d1d5db',
          backgroundColor: dragOver ? '#eff6ff' : '#fafafa',
        }}
      >
        <p className="text-sm font-medium text-gray-600">
          {uploading ? 'Uploaden...' : 'Sleep bestanden hiernaartoe of klik om te selecteren'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, afbeeldingen, Word — max. 20 MB per bestand</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => uploadBestanden(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />

      {fout && <p className="text-sm text-red-600 mt-2">{fout}</p>}
    </div>
  )
}
