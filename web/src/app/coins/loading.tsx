export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* コイン残高 */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 animate-pulse">
          <div className="h-4 w-20 bg-gray-800 rounded mb-3" />
          <div className="h-10 w-40 bg-gray-800 rounded mb-2" />
          <div className="h-3 w-28 bg-gray-800 rounded" />
        </div>

        {/* 購入パック */}
        <div className="h-6 w-28 bg-gray-800 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-4 animate-pulse">
              <div className="h-12 w-12 bg-gray-800 rounded-full mx-auto mb-3" />
              <div className="h-5 w-16 bg-gray-800 rounded mx-auto mb-2" />
              <div className="h-4 w-12 bg-gray-800 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
