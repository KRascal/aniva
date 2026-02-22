export function TypingIndicator() {
  return (
    <>
      <style>{`
        @keyframes typingWave {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          animation: typingWave 0.9s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
        }
        .typing-dot:nth-child(1) { animation-delay: 0ms; }
        .typing-dot:nth-child(2) { animation-delay: 160ms; }
        .typing-dot:nth-child(3) { animation-delay: 320ms; }
      `}</style>
      <div className="flex items-center gap-1.5 px-5 py-3.5 bg-gray-800/90 rounded-2xl rounded-tl-none backdrop-blur-sm border border-gray-700/50 w-fit">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </>
  );
}
