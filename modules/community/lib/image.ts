// Client-side image preparation for notice photos:
//  1. validate the format (JPEG / PNG / WebP / HEIC / HEIF) and size
//  2. decode HEIC/HEIF via heic2any (lazy-loaded only when needed — Chrome/
//     Firefox/Android can't decode HEIC in <canvas>)
//  3. downscale + re-encode to a small JPEG before uploading to R2

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
export const MAX_INPUT_BYTES = 25 * 1024 * 1024 // 25 MB

export type ImageError = 'format' | 'too_large' | 'decode'

function ext(file: File): string {
  return file.name.toLowerCase().split('.').pop() ?? ''
}

// Validate by MIME type, falling back to extension (HEIC often reports no type).
export function validateImageFile(file: File): ImageError | null {
  const okType = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())
  const okExt = ALLOWED_EXT.includes(ext(file))
  if (!okType && !okExt) return 'format'
  if (file.size > MAX_INPUT_BYTES) return 'too_large'
  return null
}

function isHeic(file: File): boolean {
  const t = file.type.toLowerCase()
  return t === 'image/heic' || t === 'image/heif' || ext(file) === 'heic' || ext(file) === 'heif'
}

// Returns a small JPEG Blob ready to upload, or throws an ImageError string.
export async function prepareImageForUpload(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const err = validateImageFile(file)
  if (err) throw err

  let source: Blob = file
  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality })
    source = Array.isArray(out) ? out[0] : out
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source)
  } catch {
    throw 'decode' as ImageError
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject('decode' as ImageError)), 'image/jpeg', quality)
  )
}
