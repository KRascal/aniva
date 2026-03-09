export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
