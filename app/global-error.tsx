'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#f7f7f5', color: '#2a2a2a' }}>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <p style={{ fontSize: '3.75rem', fontWeight: 800, color: '#ebebeb' }}>500</p>
          <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: '#888888' }}>An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="mt-6 px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors"
            style={{ background: '#e0655a' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
