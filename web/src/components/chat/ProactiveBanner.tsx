'use client';

import { CountdownTimer } from '../proactive/CountdownTimer';

interface ProactiveMessage {
  id: string;
  characterId: string;
  isRead: boolean;
  content: string;
  expiresAt: string;
}

interface SharedTopic {
  type: string;
  text: string;
}

interface ProactiveBannerProps {
  proactiveMessages: ProactiveMessage[];
  characterId: string;
  sharedTopics?: SharedTopic[] | null;
  onMarkAsRead: (id: string) => Promise<unknown>;
}

export function ProactiveBanner({ proactiveMessages, characterId, sharedTopics, onMarkAsRead }: ProactiveBannerProps) {
  const unreadMessages = proactiveMessages.filter(m => m.characterId === characterId && !m.isRead);

  return (
    <>
      {/* ══════════════ プロアクティブメッセージバナー ══════════════ */}
      {unreadMessages.map(msg => (
        <div
          key={msg.id}
          className="mx-3 my-1 p-2.5 bg-purple-900/30 border border-purple-500/20 rounded-2xl cursor-pointer hover:bg-purple-900/50 transition-colors"
          onClick={async () => { await onMarkAsRead(msg.id); }}
        >
          <p className="text-sm text-purple-200/80">{msg.content}</p>
          <CountdownTimer expiresAt={msg.expiresAt} className="mt-1" />
        </div>
      ))}

      {/* ══════════════ 共有トピック（覚えてくれてる記憶） ══════════════ */}
      {sharedTopics && sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 px-3 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-gray-600 flex-shrink-0">覚えてること:</span>
            {sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-xs bg-purple-900/30 text-purple-400/70 px-1.5 py-0.5 rounded-full"
              >
                {topic.type === 'like' ? '💜' : '📝'} {topic.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
