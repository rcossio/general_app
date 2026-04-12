'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <p className="text-6xl font-bold text-gray-300">500</p>
          <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
