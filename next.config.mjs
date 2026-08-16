// Content-Security-Policy in REPORT-ONLY mode: the browser reports violations
// (to the console) but blocks nothing, so this can't break the app. It's a
// safe baseline to observe before enforcing a real CSP later. Sources reflect
// current usage: map tiles + R2 photos (https:/data:/blob: images), and Next's
// inline/eval scripts. Tightening + flipping to enforce needs testing across
// the map (Leaflet/MapTiler), R2 images, and the Google OAuth redirect.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https:",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
        ],
      },
    ]
  },
}

export default nextConfig
