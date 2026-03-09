export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="h-8 w-32 bg-white/6 rounded-lg animate-pulse mb-5" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/6 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
