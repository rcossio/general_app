export default function AdminLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
