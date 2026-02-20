export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-gray-800 rounded-2xl rounded-tl-none w-fit max-w-[80px]">
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}
