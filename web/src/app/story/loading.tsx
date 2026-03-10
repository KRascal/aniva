export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* カバー画像 */}
        <div className="h-56 bg-gray-900 rounded-2xl mb-6 animate-pulse" />

        {/* タイトル・メタ */}
        <div className="animate-pulse mb-6">
          <div className="h-7 w-3/4 bg-gray-800 rounded mb-3" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-800" />
            <div className="h-4 w-24 bg-gray-800 rounded" />
            <div className="h-3 w-16 bg-gray-800 rounded" />
          </div>
        </div>

        {/* 本文 */}
        <div className="space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-4 bg-gray-800 rounded ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
