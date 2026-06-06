export default function AdventureLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
      <div className="h-8 w-32 bg-brand-border rounded mb-6" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-brand-border rounded-lg" />
        ))}
      </div>
    </div>
  )
}
