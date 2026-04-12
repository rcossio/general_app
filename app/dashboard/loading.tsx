export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
