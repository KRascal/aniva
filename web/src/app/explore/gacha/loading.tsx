export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-8 w-24 bg-gray-800 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-36 bg-gray-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-gray-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-800 rounded" />
                <div className="h-8 w-full bg-gray-800 rounded-lg mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
