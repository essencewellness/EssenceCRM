export default function ClientesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-emerald-100 rounded-lg animate-pulse" />
      </div>
      <div className="h-12 w-full bg-white rounded-xl mb-4 animate-pulse shadow-sm" />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
