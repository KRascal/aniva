export default function Loading() {
  return (
    <div className="min-h-screen bg-black pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-7 w-36 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-gray-800 rounded" />
                  <div className="h-4 w-24 bg-gray-800 rounded" />
                  <div className="h-3 w-40 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
