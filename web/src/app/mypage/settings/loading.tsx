export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="h-8 w-20 bg-gray-800 rounded mb-6 animate-pulse" />
        <div className="space-y-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-900 rounded-xl flex items-center px-4 gap-3">
              <div className="w-6 h-6 bg-gray-800 rounded" />
              <div className="h-4 bg-gray-800 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
