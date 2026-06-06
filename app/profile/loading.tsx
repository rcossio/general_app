export default function ProfileLoading() {
  return (
    <div className="max-w-md mx-auto p-4 md:p-6 animate-pulse">
      <div className="h-8 w-24 bg-brand-border rounded mb-6" />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-brand-border rounded-full" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-brand-border rounded" />
          <div className="h-3 w-48 bg-brand-border rounded" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-brand-border rounded-lg" />
        ))}
      </div>
    </div>
  )
}
