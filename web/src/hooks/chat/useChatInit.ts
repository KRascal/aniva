'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import type { RelationshipInfo } from '@/components/chat/types';
import { getCharacterTheme } from '@/lib/character-themes';
import { track, EVENTS } from '@/lib/analytics';

interface UseChatInitParams {
  session: { user?: { id?: string; email?: string } } | null;
  status: string;
  characterId: string;
  searchParams: { get: (key: string) => string | null };
  router: { push: (url: string) => void; replace: (url: string) => void };
  setCoinBalance: React.Dispatch<React.SetStateAction<number | null>>;
  setTodayMsgCount: React.Dispatch<React.SetStateAction<number>>;
  setShowFcModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFcSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatInit({
  session,
  status,
  characterId,
  searchParams,
  router,
  setCoinBalance,
  setTodayMsgCount,
  setShowFcModal,
  setShowFcSuccess,
}: UseChatInitParams) {
  const [userId, setUserId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [relationship, setRelationship] = useState<RelationshipInfo | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [shouldAutoGreet, setShouldAutoGreet] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [daysSinceLastChat, setDaysSinceLastChat] = useState(0);
  const [showStreakBreak, setShowStreakBreak] = useState(false);
  const [presence, setPresence] = useState<{ isAvailable: boolean; status: string; statusEmoji: string; statusMessage?: string | null } | null>(null);
  const [absenceBannerDismissed, setAbsenceBannerDismissed] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('UNKNOWN');
  const [dailyEvent, setDailyEvent] = useState<{ eventType: string; message: string; bonusCoins?: number; bonusXpMultiplier?: number; greeting?: string } | null>(null);
  const [showDailyEvent, setShowDailyEvent] = useState(false);
  const [charBgGradient, setCharBgGradient] = useState<string>('');

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/chat/${characterId}`)}`);
    }
  }, [status, router, characterId]);

  // userId from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; email?: string };
      if (user.id) setUserId(user.id);
    }
  }, [session]);

  // Character fetch
  useEffect(() => {
    if (!characterId) return;
    let retries = 0;
    const fetchChar = () => {
      fetch(`/api/characters/id/${characterId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.character) setCharacter(data.character);
          else if (retries < 2) { retries++; setTimeout(fetchChar, 1000); }
        })
        .catch(() => { if (retries < 2) { retries++; setTimeout(fetchChar, 1000); } });
    };
    fetchChar();
  }, [characterId]);

  // Chat visited tracking
  useEffect(() => {
    if (!characterId || typeof window === 'undefined') return;
    localStorage.setItem(`aniva_chat_visited_${characterId}`, Date.now().toString());
    track(EVENTS.CHAT_OPENED, { characterId });
  }, [characterId]);

  // Presence fetch
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/${characterId}/presence`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.presence) { setPresence(data.presence); setAbsenceBannerDismissed(false); } })
      .catch(() => {});
  }, [characterId]);

  // Character theme
  useEffect(() => {
    const slug = character?.slug ?? relationship?.character?.slug;
    if (!slug) return;
    getCharacterTheme(slug);
    setCharBgGradient(getCharacterTheme(slug).bgGradient);
  }, [character?.slug, relationship?.character?.slug]);

  // User plan
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, []);

  // FC success params
  useEffect(() => {
    if (searchParams.get('fc_success') === '1') {
      setShowFcSuccess(true);
      router.replace(`/chat/${characterId}`);
    }
    if (searchParams.get('openFc') === '1') {
      setShowFcModal(true);
      router.replace(`/chat/${characterId}`);
    }
  }, [searchParams, characterId, router, setShowFcSuccess, setShowFcModal]);

  const loadRelationshipAndHistory = useCallback(async () => {
    if (!userId || !characterId) return;
    try {
      const res = await fetch(`/api/chat/history-by-user?characterId=${characterId}&limit=50`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = (data.messages as Message[]).filter(
          (m) => m.role === 'USER' && new Date(m.createdAt) >= todayStart,
        ).length;
        setTodayMsgCount(todayCount);
      }
      if (data.relationship) {
        setRelationshipId(data.relationship.id);
        const relRes = await fetch(`/api/relationship/${characterId}`);
        const relData = await relRes.json();
        setRelationship(relData);
        // XP ref updated in page
        if (!character && relData?.character) {
          const rc = relData.character;
          setCharacter({
            id: rc.id ?? characterId,
            name: rc.name ?? '',
            nameEn: rc.nameEn ?? null,
            slug: rc.slug ?? '',
            franchise: rc.franchise ?? '',
            franchiseEn: rc.franchiseEn ?? null,
            description: rc.description ?? null,
            avatarUrl: rc.avatarUrl ?? null,
            coverUrl: rc.coverUrl ?? null,
            catchphrases: rc.catchphrases ?? [],
            personalityTraits: rc.personalityTraits ?? [],
            hasVoice: !!(rc.voiceModelId && rc.voiceModelId.trim() !== ''),
          });
        }
        if (relData.lastMessageAt) {
          const lastDate = new Date(relData.lastMessageAt);
          const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) {
            const shownKey = `welcomeBack_${characterId}_${new Date().toDateString()}`;
            if (!sessionStorage.getItem(shownKey)) {
              setDaysSinceLastChat(diffDays);
              setShowWelcomeBack(true);
              sessionStorage.setItem(shownKey, '1');
            }
          }
        }
        if (relData.totalMessages >= 50 && !relData.isFanclub) {
          const fcPromptKey = `fcPrompt_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(fcPromptKey)) {
            setTimeout(() => setShowFcModal(true), 15000);
            sessionStorage.setItem(fcPromptKey, '1');
          }
        }
        if ((relData.previousStreakDays ?? 0) >= 3 && relData.isStreakActive === false && relData.totalMessages > 0) {
          const streakKey = `streakBreak_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(streakKey)) {
            setShowStreakBreak(true);
            sessionStorage.setItem(streakKey, '1');
          }
        }
      }
      if (!data.relationship) {
        try {
          const [followRes] = await Promise.all([
            fetch(`/api/relationship/${characterId}/follow`, { method: 'POST' }),
            fetch('/api/onboarding/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationPermission: null }),
            }),
          ]);
          if (followRes.ok) {
            fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
            const relRes2 = await fetch(`/api/relationship/${characterId}`);
            const relData2 = await relRes2.json();
            setRelationship(relData2);
            if (relData2?.id) setRelationshipId(relData2.id);
          }
        } catch (e) {
          console.error('Auto-follow failed:', e);
        }
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      } else if (data.messages?.length === 0) {
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      }

      try {
        const balRes = await fetch('/api/coins/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setCoinBalance(balData.balance ?? 0);
        }
      } catch {}

      try {
        const eventRes = await fetch(`/api/daily-event${characterId ? `?characterId=${characterId}` : ''}`);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          if (eventData.isNew && eventData.event?.type) {
            setDailyEvent({
              eventType: eventData.event.type,
              message: eventData.event.message ?? '',
              bonusCoins: eventData.event.bonusCoins,
              bonusXpMultiplier: eventData.event.bonusXpMultiplier,
              greeting: eventData.character?.greeting,
            });
            setShowDailyEvent(true);
            if (eventData.event.type === 'good') {
              setTimeout(() => setShowDailyEvent(false), 4000);
            }
          }
        }
      } catch {}

      setIsLoadingHistory(false);
    } catch (err) {
      console.error('Failed to load relationship:', err);
      setIsLoadingHistory(false);
    }
  }, [userId, characterId, character, searchParams, setCoinBalance, setTodayMsgCount, setShowFcModal]);

  useEffect(() => {
    if (userId && characterId) loadRelationshipAndHistory();
  }, [userId, characterId, loadRelationshipAndHistory]);

  // Farewell effect
  useEffect(() => {
    if (!relationshipId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && relationshipId && messages.length > 2) {
        fetch('/api/chat/farewell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipId }),
          keepalive: true,
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.shouldSend && data.message) {
              sessionStorage.setItem(`farewell-${characterId}`, JSON.stringify({
                message: data.message,
                timestamp: Date.now(),
              }));
            }
          }
        }).catch(() => {});
      }
      if (document.visibilityState === 'visible') {
        const stored = sessionStorage.getItem(`farewell-${characterId}`);
        if (stored) {
          try {
            const { message: farewellText, timestamp } = JSON.parse(stored);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              setMessages((prev) => {
                const lastCharMsg = [...prev].reverse().find(m => m.role === 'CHARACTER');
                if (lastCharMsg && lastCharMsg.content === farewellText) return prev;
                if (prev.some(m => m.id?.startsWith('farewell-'))) return prev;
                const farewellMsg: Message = {
                  id: `farewell-${Date.now()}`,
                  role: 'CHARACTER',
                  content: farewellText,
                  createdAt: new Date().toISOString(),
                  metadata: { emotion: 'warm', isFarewell: true },
                };
                return [...prev, farewellMsg];
              });
            }
          } catch {}
          sessionStorage.removeItem(`farewell-${characterId}`);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [relationshipId, messages.length, characterId]);

  return {
    userId,
    character,
    setCharacter,
    messages,
    setMessages,
    relationship,
    setRelationship,
    relationshipId,
    setRelationshipId,
    isLoadingHistory,
    shouldAutoGreet,
    setShouldAutoGreet,
    showWelcomeBack,
    setShowWelcomeBack,
    daysSinceLastChat,
    showStreakBreak,
    setShowStreakBreak,
    presence,
    setPresence,
    absenceBannerDismissed,
    setAbsenceBannerDismissed,
    userPlan,
    dailyEvent,
    setDailyEvent,
    showDailyEvent,
    setShowDailyEvent,
    charBgGradient,
  };
}
