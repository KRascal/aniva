export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-800 px-4 py-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800" />
          <div className="h-5 w-32 bg-gray-800 rounded" />
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex gap-3 animate-pulse ${i % 3 === 0 ? 'justify-end' : ''}`}>
            {i % 3 !== 0 && <div className="w-8 h-8 rounded-full bg-gray-800 shrink-0" />}
            <div className={`${i % 3 === 0 ? 'bg-blue-900/30' : 'bg-gray-900'} rounded-2xl p-3 max-w-[70%]`}>
              <div className="h-4 w-32 bg-gray-800 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-800 px-4 py-3 animate-pulse">
        <div className="h-10 bg-gray-900 rounded-full" />
      </div>
    </div>
  );
}
