export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* プロフィールカード */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-800" />
            <div className="space-y-2">
              <div className="h-5 w-28 bg-gray-800 rounded" />
              <div className="h-4 w-20 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 text-center space-y-1">
                <div className="h-5 w-10 bg-gray-800 rounded mx-auto" />
                <div className="h-3 w-12 bg-gray-800 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* メニュー項目 */}
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-900 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
