'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SwipeableChatRow } from '@/components/chat-list/SwipeableChatRow';
import { SwipeableGroupChatRow } from '@/components/chat-list/SwipeableGroupChatRow';
import { EmptyState } from '@/components/chat-list/EmptyState';
import type { Character, ProactiveMessage, RelationshipInfo } from '@/components/chat-list/types';
import { logger } from '@/lib/logger';

/* ── main page ── */
export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisitMap, setLastVisitMap] = useState<Map<string, number>>(new Map());
  const [charMessages, setCharMessages] = useState<{
    characterId: string; characterName: string; avatarUrl: string | null; message: string; diffH: number; expiresAt: string;
  }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedCharMsgs, setDismissedCharMsgs] = useState<Set<string>>(new Set());
  const [proactiveMessages, setProactiveMessages] = useState<ProactiveMessage[]>([]);
  const [dismissedProactive, setDismissedProactive] = useState<Set<string>>(new Set());
  const [groupConversations, setGroupConversations] = useState<Array<{
    id: string;
    updatedAt: string;
    isPinned?: boolean;
    pinnedAt?: string | null;
    characters: Array<{ id: string; name: string; slug: string; avatarUrl: string | null }>;
    lastMessage: { role: string; content: string; createdAt: string; characterName?: string } | null;
  }>>([]);

  // Safari bfcache対策: ページ復元時にフルリロード
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // 1秒ごとにnowを更新（カウントダウンタイマー用）
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // localStorageから各キャラの最終訪問時刻を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const map = new Map<string, number>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('aniva_chat_visited_')) {
        const charId = key.replace('aniva_chat_visited_', '');
        const ts = parseInt(localStorage.getItem(key) ?? '0', 10);
        if (ts) map.set(charId, ts);
      }
    }
    setLastVisitMap(map);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadChatList = useCallback(async () => {
    if (status === 'loading') return;

    try {
      const charRes = await fetch('/api/characters');
      if (charRes.ok) {
        const charData = await charRes.json();
        setCharacters(charData.characters || []);
      }
    } catch (err) {
      logger.error('[ChatPage] characters fetch error', { error: err });
    }

    try {
      const relRes = await fetch('/api/relationship/all');
      if (relRes.ok) {
        const relData = await relRes.json();
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
          }
          setRelationships(map);
        }
      } else {
        logger.error('[ChatPage] relationship/all failed', { status: relRes.status });
      }
    } catch (err) {
      logger.error('[ChatPage] relationships fetch error', { error: err });
    }

    try {
      const msgRes = await fetch('/api/character-messages');
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        if (Array.isArray(msgs)) setCharMessages(msgs);
      }
    } catch { /* ignore */ }

    try {
      const proRes = await fetch('/api/proactive-messages');
      if (proRes.ok) {
        const data = await proRes.json();
        if (data.messages) setProactiveMessages(data.messages.filter((m: ProactiveMessage) => !m.isRead));
      }
    } catch { /* ignore */ }

    try {
      const groupRes = await fetch('/api/chat/group');
      if (groupRes.ok) {
        const data = await groupRes.json();
        if (data.conversations) setGroupConversations(data.conversations);
      }
    } catch { /* ignore */ }

    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadChatList();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', loadChatList);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', loadChatList);
    };
  }, [loadChatList]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-800 animate-pulse" />
            <div className="h-5 w-16 bg-gray-800 rounded-full animate-pulse" />
          </div>
        </header>
        <div className="max-w-lg mx-auto py-2 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── ソート用ヘルパー ──
  const getEffectiveTime = (charId: string, rel: RelationshipInfo): number => {
    const msgTime = rel.lastMessageAt ? new Date(rel.lastMessageAt).getTime() : 0;
    const latestProactive = proactiveMessages
      .filter(m => m.character?.id === charId)
      .reduce((max, m) => {
        const t = new Date(m.createdAt).getTime();
        return t > max ? t : max;
      }, 0);
    return Math.max(msgTime, latestProactive);
  };

  const charsWithHistory = characters
    .filter((c) => {
      const rel = relationships.get(c.id);
      return rel && (rel.isFollowing || rel.totalMessages > 0);
    })
    .sort((a, b) => {
      const relA = relationships.get(a.id);
      const relB = relationships.get(b.id);
      const pinnedA = relA?.isPinned ? 1 : 0;
      const pinnedB = relB?.isPinned ? 1 : 0;
      if (pinnedA !== pinnedB) return pinnedB - pinnedA;
      if (pinnedA && pinnedB) {
        const pA = relA?.pinnedAt ? new Date(relA.pinnedAt).getTime() : 0;
        const pB = relB?.pinnedAt ? new Date(relB.pinnedAt).getTime() : 0;
        return pB - pA;
      }
      const timeA = relA ? getEffectiveTime(a.id, relA) : 0;
      const timeB = relB ? getEffectiveTime(b.id, relB) : 0;
      return timeB - timeA;
    });

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/40">
              A
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">ANIVA</h1>
          </div>
          <div className="text-xs text-white/40 font-mono truncate max-w-[140px]">
            {session?.user?.email}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-32">
        {/* ══ 新着チャット通知バナー（非表示: exploreに限定メッセージがあるため不要） ══ */}
        {false && proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).length > 0 && (
          <div className="mb-4 space-y-2">
            {proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).slice(0, 3).map(msg => (
              <div
                key={msg.id}
                className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
                onClick={() => {
                  setDismissedProactive(prev => new Set([...prev, msg.id]));
                  router.push(`/chat/${msg.character?.slug || msg.character?.id}`);
                }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-400/50">
                  {msg.character?.avatarUrl ? (
                    <img src={msg.character.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">{msg.character?.name?.[0] || '?'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{msg.character?.name || 'キャラクター'}</p>
                  <p className="text-white/60 text-xs truncate">{msg.message}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">NEW</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ グループチャットバナー ══ */}
        <button
          onClick={() => router.push('/chat/group')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(157,23,77,0.2), rgba(30,27,75,0.15))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 20px rgba(139,92,246,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">グループチャット</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(139,92,246,0.25)', color: 'rgba(196,181,254,0.9)', border: '1px solid rgba(139,92,246,0.3)' }}>NEW</span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">キャラ同士の掛け合いを見よう！</p>
            </div>
            <span className="text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }}>試す →</span>
          </div>
        </button>

        {/* ══ キャラからのメッセージバナー — 不要（探すに限定メッセージがあるため）══ */}
        {false && charMessages.filter(m => !dismissedCharMsgs.has(m.characterId) && new Date(m.expiresAt).getTime() > now).map(msg => {
          const remainMs = new Date(msg.expiresAt).getTime() - now;
          const remainH = Math.floor(remainMs / 3600000);
          const remainM = Math.floor((remainMs % 3600000) / 60000);
          const remainS = Math.floor((remainMs % 60000) / 1000);
          const pad = (n: number) => String(n).padStart(2, '0');
          const countdownStr = `${pad(remainH)}:${pad(remainM)}:${pad(remainS)}`;
          const isUrgent = remainMs < 3600000;
          return (
            <div
              key={msg.characterId}
              className="mb-3 bg-gradient-to-r from-purple-900/70 to-pink-900/50 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
              onClick={() => router.push(`/chat/${msg.characterId}`)}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-400/50">
                  {msg.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.avatarUrl} alt={msg.characterName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-700 flex items-center justify-center text-white font-bold">{msg.characterName.charAt(0)}</div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-xs">💬</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300 font-bold mb-0.5">{msg.characterName} からメッセージ</p>
                <p className="text-sm text-white/90 italic truncate">「{msg.message}」</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                <span className={`text-[10px] font-bold font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                  {countdownStr}
                </span>
                <button
                  className="text-gray-500 hover:text-gray-300 text-xs"
                  onClick={e => { e.stopPropagation(); setDismissedCharMsgs(prev => new Set([...prev, msg.characterId])); }}
                >✕</button>
              </div>
            </div>
          );
        })}

        {/* ══ キャラ主導メッセージ — 不要（探すに限定メッセージがあるため）══ */}
        {false && proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).map(msg => {
          const diffMs = Date.now() - new Date(msg.createdAt).getTime();
          const diffH = Math.floor(diffMs / 3600000);
          const handleClick = async () => {
            fetch(`/api/proactive-messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
            setDismissedProactive(prev => new Set([...prev, msg.id]));
            router.push(`/chat/${msg.character?.id}`);
          };
          return (
            <div
              key={msg.id}
              className="mb-3 bg-gradient-to-r from-indigo-900/70 to-purple-900/50 border border-indigo-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
              onClick={handleClick}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-400/50">
                  {msg.character?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.character.avatarUrl} alt={msg.character?.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-700 flex items-center justify-center text-white font-bold">{msg.character?.name?.charAt(0) || '?'}</div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-xs">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-300 font-bold mb-0.5">{msg.character?.name || 'キャラクター'} が呼んでいる <span className="text-gray-500 font-normal">({diffH > 0 ? `${diffH}時間前` : 'たった今'})</span></p>
                <p className="text-sm text-white/90 italic truncate">「{msg.message}」</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                <span className="text-[10px] text-pink-400 animate-pulse">NEW</span>
                <button
                  className="text-gray-500 hover:text-gray-300 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    fetch(`/api/proactive-messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
                    setDismissedProactive(prev => new Set([...prev, msg.id]));
                  }}
                >✕</button>
              </div>
            </div>
          );
        })}

        {/* チャット一覧（1on1 + グループ混在・ピン優先→時系列降順） */}
        {charsWithHistory.length === 0 && groupConversations.length === 0 ? (
          <EmptyState
            characters={characters}
            relationships={relationships}
            onNavigate={(path) => router.push(path)}
          />

        ) : (() => {
          // ── union type list ──
          type ChatItem =
            | { kind: 'char'; character: Character; sortTime: number; isPinned: boolean; pinnedAt: number }
            | { kind: 'group'; conv: typeof groupConversations[0]; sortTime: number; isPinned: boolean; pinnedAt: number };

          const items: ChatItem[] = [
            ...charsWithHistory.map((character): ChatItem => {
              const rel = relationships.get(character.id)!;
              return {
                kind: 'char',
                character,
                sortTime: getEffectiveTime(character.id, rel),
                isPinned: !!rel.isPinned,
                pinnedAt: rel.pinnedAt ? new Date(rel.pinnedAt).getTime() : 0,
              };
            }),
            ...groupConversations.map((conv): ChatItem => ({
              kind: 'group',
              conv,
              sortTime: new Date(conv.updatedAt).getTime(),
              isPinned: !!conv.isPinned,
              pinnedAt: conv.pinnedAt ? new Date(conv.pinnedAt).getTime() : 0,
            })),
          ];

          // ピン→ピン時刻降順→非ピン→時系列降順
          items.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            if (a.isPinned && b.isPinned) return b.pinnedAt - a.pinnedAt;
            return b.sortTime - a.sortTime;
          });

          return (
            <div className="space-y-1">
              {items.map((item) => {
                if (item.kind === 'group') {
                  const conv = item.conv;
                  return (
                    <SwipeableGroupChatRow
                      key={`group-${conv.id}`}
                      conversation={conv}
                      onClick={() => router.push(`/chat/group?conversationId=${conv.id}`)}
                      onPin={async () => {
                        const newPin = !conv.isPinned;
                        try {
                          const res = await fetch('/api/chat/group/pin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ conversationId: conv.id, pin: newPin }),
                          });
                          if (res.ok) {
                            setGroupConversations(prev => prev.map(c =>
                              c.id === conv.id
                                ? { ...c, isPinned: newPin, pinnedAt: newPin ? new Date().toISOString() : null }
                                : c
                            ));
                          }
                        } catch (err) {
                          logger.error('[ChatPage] group pin error', { error: err });
                        }
                      }}
                      onDelete={async () => {
                        try {
                          const res = await fetch(`/api/chat/group?conversationId=${conv.id}`, {
                            method: 'DELETE',
                          });
                          if (res.ok) {
                            setGroupConversations(prev => prev.filter(c => c.id !== conv.id));
                          }
                        } catch (err) {
                          logger.error('[ChatPage] group delete error', { error: err });
                        }
                      }}
                    />
                  );
                }

                const character = item.character;
                const rel = relationships.get(character.id)!;
                const lastVisited = lastVisitMap.get(character.id) ?? (character.slug ? lastVisitMap.get(character.slug) ?? 0 : 0);
                const lastMsgAt = rel.lastMessageAt ? new Date(rel.lastMessageAt).getTime() : 0;
                const lastMsgIsFromChar = rel.lastMessage?.role !== 'USER';
                const hasUnread = lastMsgIsFromChar && lastMsgAt > lastVisited;
                const charProactiveCount = proactiveMessages.filter(m => m.character?.id === character.id && !dismissedProactive.has(m.id)).length;
                const totalUnread = (hasUnread ? 1 : 0) + charProactiveCount;
                return (
                  <SwipeableChatRow
                    key={character.id}
                    character={character}
                    relationship={rel}
                    hasUnread={hasUnread || charProactiveCount > 0}
                    unreadCount={totalUnread}
                    isPinned={!!rel.isPinned}
                    isMuted={!!rel.isMuted}
                    isFanclub={!!rel.isFanclub}
                    onClick={() => router.push(`/chat/${character.slug || character.id}`)}
                    onPin={async () => {
                      const newPin = !rel.isPinned;
                      try {
                        const res = await fetch('/api/relationship/pin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ characterId: character.id, pin: newPin }),
                        });
                        if (res.ok) {
                          setRelationships(prev => {
                            const next = new Map(prev);
                            const updated = { ...rel, isPinned: newPin, pinnedAt: newPin ? new Date().toISOString() : null };
                            next.set(character.id, updated);
                            return next;
                          });
                        }
                      } catch (err) {
                        logger.error('[ChatPage] pin error', { error: err });
                      }
                    }}
                    onMute={async () => {
                      const newMute = !rel.isMuted;
                      try {
                        const res = await fetch('/api/relationship/mute', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ characterId: character.id, mute: newMute }),
                        });
                        if (res.ok) {
                          setRelationships(prev => {
                            const next = new Map(prev);
                            const updated = { ...rel, isMuted: newMute };
                            next.set(character.id, updated);
                            return next;
                          });
                        }
                      } catch (err) {
                        logger.error('[ChatPage] mute error', { error: err });
                      }
                    }}
                    onUnfollow={async () => {
                      try {
                        const res = await fetch(`/api/relationship/${character.id}/follow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ follow: false }),
                        });
                        if (res.ok) {
                          loadChatList();
                        }
                      } catch (err) {
                        logger.error('[ChatPage] unfollow error', { error: err });
                      }
                    }}
                  />
                );
              })}
            </div>
          );
        })()}
      </main>
    </div>
  );
}


