import { memberUploadAuthHeaders } from '@/utils/memberUploadAuth'

function loadImage(fileBlob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(fileBlob)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => reject(new Error('อ่านรูปไม่ได้'))
    img.src = objectUrl
  })
}

const JPEG_FLAT_BG = '#f8fafc'

async function compressToJpeg(file: File, maxSide = 1200): Promise<Blob> {
  const img = await loadImage(file)
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const w = Math.round(img.width * ratio)
  const h = Math.round(img.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('บีบอัดไม่สำเร็จ')
  ctx.fillStyle = JPEG_FLAT_BG
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('บีบอัดไม่สำเร็จ'))),
      'image/jpeg',
      0.85
    )
  })
}

function isProbablyPng(file: File): boolean {
  return (
    (file.type && String(file.type).toLowerCase() === 'image/png') ||
    /\.png$/i.test(file.name || '')
  )
}

export async function uploadGameImageFile(
  _apiBase: string,
  file: File,
  opts?: { maxCompressSide?: number }
): Promise<string> {
  const side = opts?.maxCompressSide ?? 1200
  const body = new FormData()
  if (isProbablyPng(file)) {
    body.append(
      'image',
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    )
  } else {
    const blob = await compressToJpeg(file, side)
    body.append('image', new File([blob], `${Date.now()}.jpg`, { type: 'image/jpeg' }))
  }
  const res = await fetch('/upload', {
    method: 'POST',
    body,
    headers: memberUploadAuthHeaders(),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; publicUrl?: string }
  if (!res.ok || !data.ok) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ')
  return String(data.publicUrl || '')
}
