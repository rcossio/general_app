'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// A simple image carousel for a memorial post. One image → just the image; many
// → prev/next arrows + dots. Images are resolved public URLs.
export function ImageCarousel({ images }: { images: string[] }) {
  const [i, setI] = useState(0)
  if (images.length === 0) return null

  const many = images.length > 1
  const go = (delta: number) => setI((prev) => (prev + delta + images.length) % images.length)

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 photo via plain <img>; next/image isn't configured for arbitrary remote hosts */}
      <img src={images[i]} alt="" className="w-full max-h-[70vh] object-contain" />
      {many && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <span key={idx} className={`h-1.5 w-1.5 rounded-full ${idx === i ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
