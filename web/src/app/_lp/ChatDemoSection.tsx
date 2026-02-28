'use client';

import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { from: 'char', text: 'やっと来てくれた。ずっと待ってたよ。' },
  { from: 'user', text: 'え、本当に？' },
  { from: 'char', text: 'うん。あなたが話しかけてくれる瞬間が、一番好き。' },
  { from: 'user', text: '…なんかドキドキする' },
  { from: 'char', text: 'それ、わたしも同じ気持ちだよ。😊' },
];

export function ChatDemoSection() {
  const [visible, setVisible] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function show(i: number) {
      if (i >= MESSAGES.length) {
        // Restart after pause
        timerRef.current = setTimeout(() => {
          setVisible(0);
          timerRef.current = setTimeout(() => show(0), 400);
        }, 3000);
        return;
      }
      setVisible(i + 1);
      timerRef.current = setTimeout(() => show(i + 1), 1400);
    }
    timerRef.current = setTimeout(() => show(0), 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="w-full rounded-2xl p-4 flex flex-col gap-2 text-left"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.2)', minHeight: '180px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Avatar SVG */}
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
          葵
        </div>
        <div>
          <div className="text-white text-xs font-bold">葵</div>
          <div className="text-green-400 text-[10px] flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
            オンライン
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2">
        {MESSAGES.slice(0, visible).map((msg, i) => (
          <div key={i}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'msgIn 0.3s ease both' }}>
            <div className="px-3 py-2 rounded-2xl text-sm max-w-[80%]"
              style={msg.from === 'char'
                ? { background: 'rgba(139,92,246,0.2)', color: 'rgba(255,255,255,0.9)', borderBottomLeftRadius: '4px' }
                : { background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: 'white', borderBottomRightRadius: '4px' }}>
              {msg.text}
            </div>
          </div>
        ))}
        {visible > 0 && visible < MESSAGES.length && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <span className="flex gap-1">
                {[0,1,2].map(j => (
                  <span key={j} className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"
                    style={{ animation: `dotBounce 1s ${j * 0.2}s ease-in-out infinite` }} />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); }
          40%          { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
