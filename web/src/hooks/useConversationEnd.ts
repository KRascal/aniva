'use client';

/**
 * useConversationEnd.ts
 * ピークエンドの法則 — 5分間非アクティブでエンディングメッセージをトリガーするフック
 *
 * 動作:
 * 1. ユーザーの最後のメッセージ送信時刻を監視
 * 2. 5分経過したら /api/chat/end-session を呼び出す
 * 3. エンディングメッセージが返ってきたら onEndingMessage コールバックで通知
 * 4. visibilitychange / beforeunload でも即時トリガー
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────────── 型 ─────────────── */
export interface EndingMessagePayload {
  id: string;
  content: string;
  role: 'CHARACTER';
  metadata: { isEnding: boolean; emotion?: string };
  createdAt: string;
}

export interface UseConversationEndOptions {
  /** 関係ID（必須） */
  relationshipId: string | null | undefined;
  /** 会話ID（任意：指定するとその会話のメッセージを使用） */
  conversationId?: string | null;
  /** エンディングメッセージ受信時のコールバック */
  onEndingMessage: (msg: EndingMessagePayload) => void;
  /** タイムアウト時間（ミリ秒、デフォルト: 5分） */
  timeoutMs?: number;
  /** true のとき監視を無効化 */
  disabled?: boolean;
}

export interface UseConversationEndReturn {
  /** ユーザーのメッセージ送信時に呼ぶ（タイマーリセット） */
  onUserMessage: () => void;
  /** 手動でエンディングをトリガー */
  triggerEnding: () => void;
  /** 現在タイムアウト監視中か */
  isWatching: boolean;
  /** エンディングメッセージ送信済みか */
  endingSent: boolean;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5分

/* ─────────────── フック ─────────────── */
export function useConversationEnd({
  relationshipId,
  conversationId,
  onEndingMessage,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  disabled = false,
}: UseConversationEndOptions): UseConversationEndReturn {
  const [isWatching, setIsWatching] = useState(false);
  const [endingSent, setEndingSent] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentRef = useRef(false); // レンダー外で追跡（クロージャ問題対策）
  const relationshipIdRef = useRef(relationshipId);
  const conversationIdRef = useRef(conversationId);
  const onEndingMessageRef = useRef(onEndingMessage);

  // ref を最新に保つ
  useEffect(() => { relationshipIdRef.current = relationshipId; }, [relationshipId]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { onEndingMessageRef.current = onEndingMessage; }, [onEndingMessage]);

  /* ─── エンディング API 呼び出し ─── */
  const callEndSession = useCallback(async () => {
    const rId = relationshipIdRef.current;
    if (!rId || sentRef.current) return;

    sentRef.current = true;
    setEndingSent(true);
    setIsWatching(false);

    try {
      const res = await fetch('/api/chat/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: rId,
          conversationId: conversationIdRef.current ?? undefined,
        }),
        // keepalive: beforeunload でも確実に送信
        keepalive: true,
      });

      if (!res.ok) {
        console.warn('[useConversationEnd] API error:', res.status);
        return;
      }

      const data = await res.json();
      if (data.sent && data.message) {
        onEndingMessageRef.current(data.message as EndingMessagePayload);
      }
    } catch (e) {
      console.error('[useConversationEnd] fetch error:', e);
    }
  }, []);

  /* ─── タイマーリセット ─── */
  const resetTimer = useCallback(() => {
    if (disabled || !relationshipIdRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setIsWatching(true);
    timerRef.current = setTimeout(() => {
      callEndSession();
    }, timeoutMs);
  }, [disabled, timeoutMs, callEndSession]);

  /* ─── ユーザーメッセージ送信時に呼ぶ ─── */
  const onUserMessage = useCallback(() => {
    if (disabled) return;
    // 新しいメッセージが来たらリセット（エンディング送信済みなら再開）
    sentRef.current = false;
    setEndingSent(false);
    resetTimer();
  }, [disabled, resetTimer]);

  /* ─── 手動トリガー ─── */
  const triggerEnding = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    callEndSession();
  }, [callEndSession]);

  /* ─── visibilitychange / beforeunload でも送信 ─── */
  useEffect(() => {
    if (disabled || !relationshipId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isWatching && !sentRef.current) {
        // タブが非表示になったら即座に送信
        callEndSession();
      }
    };

    const handleBeforeUnload = () => {
      if (isWatching && !sentRef.current) {
        callEndSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disabled, relationshipId, isWatching, callEndSession]);

  /* ─── クリーンアップ ─── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ─── disabled 変更時にタイマーをクリア ─── */
  useEffect(() => {
    if (disabled && timerRef.current) {
      clearTimeout(timerRef.current);
      setIsWatching(false);
    }
  }, [disabled]);

  return { onUserMessage, triggerEnding, isWatching, endingSent };
}

export default useConversationEnd;
