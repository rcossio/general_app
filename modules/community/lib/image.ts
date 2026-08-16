// Client-side image preparation for notice photos: validate (JPEG/PNG only),
// capture the bytes into memory, then downscale + re-encode to a small JPEG
// before uploading to R2.
//
// HEIC/HEIF is intentionally NOT supported: decoding it in the browser
// (heic2any/WASM) blocked the main thread on large photos and froze the UI.
// iPhone/Android users on "High Efficiency" mode should switch to "Most
// Compatible" (JPEG).

import { resizeToBlob } from '@/lib/imageResize'

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

// Returns a small JPEG Blob ready to upload, or throws an ImageError string.
// The canvas downscale itself lives in lib/imageResize (shared with the avatar
// upload); here we add the JPEG/PNG validation and normalise any decode/encode
// failure to the 'decode' ImageError the UI knows how to message.
export async function prepareImageForUpload(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const err = validateImageFile(file)
  if (err) throw err
  try {
    return await resizeToBlob(file, { maxDim, type: 'image/jpeg', quality })
  } catch {
    throw 'decode' as ImageError
  }
}
