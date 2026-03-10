export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-8 w-28 bg-gray-800 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-2/3 bg-gray-800 rounded" />
                <div className="h-4 w-full bg-gray-800 rounded" />
                <div className="h-4 w-4/5 bg-gray-800 rounded" />
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800" />
                  <div className="h-3 w-20 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
