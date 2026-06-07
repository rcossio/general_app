// Client-side image preparation for notice photos: validate (JPEG/PNG only),
// capture the bytes into memory, then downscale + re-encode to a small JPEG
// before uploading to R2.
//
// HEIC/HEIF is intentionally NOT supported: decoding it in the browser
// (heic2any/WASM) blocked the main thread on large photos and froze the UI.
// iPhone/Android users on "High Efficiency" mode should switch to "Most
// Compatible" (JPEG).

const ALLOWED_EXT = ['jpg', 'jpeg', 'png']
export const MAX_INPUT_BYTES = 25 * 1024 * 1024 // 25 MB

export type ImageError = 'format' | 'too_large' | 'decode'

function ext(file: File): string {
  return file.name.toLowerCase().split('.').pop() ?? ''
}

// Accept only JPEG/PNG; anything else (incl. HEIC/HEIF, WebP, GIF) is rejected
// with a "format" error. Android pickers sometimes hand back real JPEGs with an
// empty MIME type and no extension, so a file with no signal at all is allowed
// through — the decoder below is then the final arbiter.
export function validateImageFile(file: File): ImageError | null {
  if (file.size > MAX_INPUT_BYTES) return 'too_large'
  const type = file.type.toLowerCase()
  const extension = ext(file)
  const isJpgPng = type === 'image/jpeg' || type === 'image/png' || ALLOWED_EXT.includes(extension)
  const noSignal = type === '' && extension === ''
  if (!isJpgPng && !noSignal) return 'format'
  return null
}

// Copy the picked file's bytes into an in-memory File immediately, while it's
// still readable. Android gallery picks are backed by a content:// URI that can
// go stale between selection and upload — after which both <img> and
// arrayBuffer() fail even though file.size still works. Capturing the bytes now
// makes the rest of the pipeline immune to that.
export async function readStableImage(file: File): Promise<File> {
  const buf = await file.arrayBuffer()
  return new File([buf], file.name || 'photo.jpg', { type: file.type || 'image/jpeg' })
}

// Load a blob into an <img> element. Broadly compatible (mirrors the proven
// avatar-upload path in app/profile/page.tsx).
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
      reject(new Error('load'))
    }
    img.src = url
  })
}

// Returns a small JPEG Blob ready to upload, or throws an ImageError string.
export async function prepareImageForUpload(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const err = validateImageFile(file)
  if (err) throw err

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    throw 'decode' as ImageError
  }

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw 'decode' as ImageError
  ctx.drawImage(img, 0, 0, w, h)

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject('decode' as ImageError)), 'image/jpeg', quality)
  )
}
