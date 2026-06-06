import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

// Only public, indexable routes (must match the Allow list in public/robots.txt).
// Authenticated routes are intentionally excluded — robots.txt disallows them.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
