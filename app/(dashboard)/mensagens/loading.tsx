export default function MensagensLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="h-8 w-44 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-1/5 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-emerald-100 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2 ml-12">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
