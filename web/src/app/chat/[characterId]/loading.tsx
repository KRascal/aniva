export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ヘッダースケルトン */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-800" />
        <div className="h-5 w-32 bg-gray-800 rounded" />
        <div className="ml-auto h-4 w-16 bg-gray-800 rounded" />
      </div>
      {/* メッセージスケルトン */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
            <div className={`h-12 rounded-2xl bg-gray-800 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
          </div>
        ))}
      </div>
      {/* 入力スケルトン */}
      <div className="p-4 border-t border-gray-800 animate-pulse">
        <div className="h-12 bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}
