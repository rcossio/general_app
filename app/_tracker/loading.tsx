export default function TrackerLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-32 bg-brand-border rounded" />
        <div className="h-9 w-28 bg-brand-border rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-brand-border rounded-lg" />
        ))}
      </div>
    </div>
  )
}
