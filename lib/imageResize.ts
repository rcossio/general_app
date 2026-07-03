// Shared client-side image downscale via a <canvas>. Both the community photo
// pipeline (modules/community/lib/image.ts) and the profile avatar upload use
// this, so there is ONE canvas-resize routine to understand and fix (e.g. adding
// EXIF-orientation handling) instead of two copies that drift apart. Callers
// keep their own validation and their own output type/quality.

// Load a blob into an <img> element. Broadly compatible across mobile browsers.
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

export interface ResizeOptions {
  maxDim: number // longest edge, in px; the image is scaled down to fit (never up)
  type?: string // output MIME type, default 'image/jpeg'
  quality?: number // 0..1, default 0.8
}

// Downscale an image blob to fit maxDim and re-encode it. Resolves with the
// encoded Blob; rejects if the image can't be decoded/encoded.
export async function resizeToBlob(
  file: Blob,
  { maxDim, type = 'image/jpeg', quality = 0.8 }: ResizeOptions
): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, quality)
  )
}
