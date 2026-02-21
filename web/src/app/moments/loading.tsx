export default function Loading() {
  return (
    <div className="min-h-screen bg-black pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-800" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-800 rounded" />
                <div className="h-3 w-16 bg-gray-800 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded w-full" />
              <div className="h-4 bg-gray-800 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
