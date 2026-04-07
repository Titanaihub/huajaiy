function loadImage(fileBlob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(fileBlob)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('ไม่สามารถอ่านไฟล์รูปได้'))
    }
    img.src = objectUrl
  })
}

export async function compressImageToJpegBlob(originalFile: File): Promise<Blob> {
  const img = await loadImage(originalFile)
  const maxSide = 1600
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const width = Math.round(img.width * ratio)
  const height = Math.round(img.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('ไม่สามารถบีบอัดรูปได้')
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('บีบอัดรูปไม่สำเร็จ'))
        resolve(blob)
      },
      'image/jpeg',
      0.82
    )
  })
}

/** POST /upload — same-origin; Next rewrites ไป API (ใช้กับ API ในเครื่องได้) */
export async function uploadSlipImageFile(file: File): Promise<string> {
  const body = new FormData()
  const compressed = await compressImageToJpegBlob(file)
  const uploadFile = new File([compressed], `${Date.now()}.jpg`, { type: 'image/jpeg' })
  body.append('image', uploadFile)
  const res = await fetch('/upload', { method: 'POST', body })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; publicUrl?: string; error?: string }
  if (!res.ok || !data.ok || !data.publicUrl) {
    throw new Error(data.error || 'อัปโหลดสลิปไม่สำเร็จ')
  }
  return data.publicUrl
}
