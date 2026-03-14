'use client';

import { useState, useCallback, useRef } from 'react';

interface CtxMenuCharacter {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CtxMenu {
  msgId: string;
  content: string;
}

export function useMessageContextMenu({
  character,
  setShareToast,
}: {
  character: CtxMenuCharacter | null;
  setShareToast: (msg: string | null) => void;
}) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMsgLongPressStart = useCallback((msgId: string, content: string) => {
    longPressTimer.current = setTimeout(() => {
      setCtxMenu({ msgId, content });
    }, 500);
  }, []);

  const handleMsgLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCopyMsg = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        setShareToast('コピーしました ✓');
        setTimeout(() => setShareToast(null), 2000);
      } catch {
        const el = document.createElement('textarea');
        el.value = content;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setShareToast('コピーしました ✓');
        setTimeout(() => setShareToast(null), 2000);
      }
      setCtxMenu(null);
    },
    [setShareToast],
  );

  const handleBookmarkMsg = useCallback(
    (msgId: string, content: string) => {
      try {
        const key = 'aniva_bookmarks';
        const existing: Array<{
          id: string;
          characterId: string;
          characterName: string;
          avatarUrl: string | null;
          content: string;
          savedAt: number;
        }> = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (!existing.find((b) => b.id === msgId)) {
          existing.unshift({
            id: msgId,
            characterId: character?.id ?? '',
            characterName: character?.name ?? '',
            avatarUrl: character?.avatarUrl ?? null,
            content,
            savedAt: Date.now(),
          });
          if (existing.length > 50) existing.splice(50);
          localStorage.setItem(key, JSON.stringify(existing));
        }
        setShareToast('ブックマークしました 🔖');
        setTimeout(() => setShareToast(null), 2000);
      } catch {
        // ignore
      }
      setCtxMenu(null);
    },
    [character, setShareToast],
  );

  const handleShareMsg = useCallback(
    (content: string) => {
      if (navigator.share) {
        navigator.share({ text: content }).catch(() => {});
      } else {
        handleCopyMsg(content);
      }
      setCtxMenu(null);
    },
    [handleCopyMsg],
  );

  return {
    ctxMenu,
    setCtxMenu,
    handleMsgLongPressStart,
    handleMsgLongPressEnd,
    handleCopyMsg,
    handleBookmarkMsg,
    handleShareMsg,
  };
}
