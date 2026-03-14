export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* パルスするロゴマーク */}
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 animate-pulse shadow-lg shadow-purple-900/30" />
          <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 animate-ping opacity-20" />
        </div>
      </div>
    </div>
  );
}
