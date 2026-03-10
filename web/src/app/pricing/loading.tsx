export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-8 w-32 bg-gray-800 rounded mb-2 animate-pulse" />
        <div className="h-4 w-48 bg-gray-800 rounded mb-8 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-6 animate-pulse">
              <div className="h-5 w-24 bg-gray-800 rounded mb-3" />
              <div className="h-8 w-32 bg-gray-800 rounded mb-4" />
              <div className="space-y-2 mb-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 w-3/4 bg-gray-800 rounded" />
                ))}
              </div>
              <div className="h-12 w-full bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
