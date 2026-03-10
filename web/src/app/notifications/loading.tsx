export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-8 w-20 bg-gray-800 rounded mb-6 animate-pulse" />
        <div className="space-y-2 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900">
              <div className="w-10 h-10 rounded-full bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-800 rounded" />
              </div>
              <div className="h-3 w-10 bg-gray-800 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
