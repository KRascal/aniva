export default function Loading() {
  const widths = ["w-3/5", "w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4", "w-2/5"];

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="space-y-2">
          {widths.map((w, i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-white/[0.06] animate-pulse flex items-center gap-3 px-3"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0" />
              <div className={`h-4 rounded bg-white/[0.06] ${w}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
