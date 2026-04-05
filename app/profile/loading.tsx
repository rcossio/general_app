export default function ProfileLoading() {
  return (
    <div className="max-w-md mx-auto p-4 md:p-6 animate-pulse">
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
