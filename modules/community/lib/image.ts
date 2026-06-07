// Client-side image preparation for notice photos:
//  1. validate the format (JPEG / PNG / WebP / HEIC / HEIF) and size
//  2. decode HEIC/HEIF via heic2any (lazy-loaded only when needed — Chrome/
//     Firefox/Android can't decode HEIC in <canvas>)
//  3. downscale + re-encode to a small JPEG before uploading to R2

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
export const MAX_INPUT_BYTES = 25 * 1024 * 1024 // 25 MB

export type ImageError = 'format' | 'too_large' | 'decode'

function ext(file: File): string {
  return file.name.toLowerCase().split('.').pop() ?? ''
}

// Reject only on a *conclusive* non-image signal. Android pickers (Google
// Photos especially) often hand back real JPEGs with an empty/generic MIME
// type and no file extension — those must not be rejected here. When we can't
// tell, we let the decode step below be the real arbiter of "usable image".
export function validateImageFile(file: File): ImageError | null {
  if (file.size > MAX_INPUT_BYTES) return 'too_large'
  const type = file.type.toLowerCase()
  const conclusivelyNotImage =
    type !== '' && !type.startsWith('image/') && !ALLOWED_EXT.includes(ext(file))
  if (conclusivelyNotImage) return 'format'
  return null
}

function isHeic(file: File): boolean {
  const t = file.type.toLowerCase()
  return t === 'image/heic' || t === 'image/heif' || ext(file) === 'heic' || ext(file) === 'heif'
}

// Load a blob into an <img> element. This is more broadly compatible than
// createImageBitmap (which fails on some Android/iOS browsers and certain
// JPEGs) and mirrors the proven avatar-upload path in app/profile/page.tsx.
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject('decode' as ImageError)
    }
    img.src = url
  })
}

// Returns a small JPEG Blob ready to upload, or throws an ImageError string.
export async function prepareImageForUpload(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const err = validateImageFile(file)
  if (err) throw err

  let source: Blob = file
  if (isHeic(file)) {
    try {
      const heic2any = (await import('heic2any')).default
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality })
      source = Array.isArray(out) ? out[0] : out
    } catch {
      throw 'decode' as ImageError
    }
  }

  const img = await loadImage(source)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject('decode' as ImageError)), 'image/jpeg', quality)
  )
}
