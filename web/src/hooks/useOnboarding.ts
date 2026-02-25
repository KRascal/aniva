'use client';

import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type OnboardingPhase =
  | 'welcome'           // Phase 1: 沈黙のウェルカム
  | 'character_select'  // Phase 1.5: キャラ選択（汎用流入のみ）
  | 'nickname'          // Phase 2: 呼びかけ
  | 'approval'          // Phase 3: 承認
  | 'first_chat'        // Phase 4: 5往復チャット
  | 'hook';             // Phase 5: 定着フック

export interface CharacterData {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise?: string;
  greeting?: string;
  greetingVariant?: 1 | 2 | 3;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingState {
  phase: OnboardingPhase;
  nickname: string;
  selectedCharacter: CharacterData | null;
  conversationHistory: ChatMessage[];
  isDeepLink: boolean;
  deeplinkSlug?: string;
  turnIndex: number;
  redirectTo: string;
}

const DEEP_LINK_PHASES: OnboardingPhase[] = [
  'welcome',
  'nickname',
  'approval',
  'first_chat',
  'hook',
];

const GENERIC_PHASES: OnboardingPhase[] = [
  'welcome',
  'character_select',
  'nickname',
  'approval',
  'first_chat',
  'hook',
];

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useOnboarding(initialDeeplinkCharacter?: CharacterData, initialSlug?: string) {
  const [state, setState] = useState<OnboardingState>({
    phase: 'welcome',
    nickname: '',
    selectedCharacter: initialDeeplinkCharacter ?? null,
    conversationHistory: [],
    isDeepLink: !!initialDeeplinkCharacter,
    deeplinkSlug: initialSlug,
    turnIndex: 0,
    redirectTo: initialDeeplinkCharacter ? `/c/${initialSlug}` : '/explore',
  });

  /** Advance to next phase, optionally merging state updates */
  const advance = useCallback((updates?: Partial<OnboardingState>) => {
    setState((prev) => {
      const phaseOrder = prev.isDeepLink ? DEEP_LINK_PHASES : GENERIC_PHASES;
      const currentIndex = phaseOrder.indexOf(prev.phase);
      const nextPhase = phaseOrder[Math.min(currentIndex + 1, phaseOrder.length - 1)];
      return { ...prev, phase: nextPhase, ...updates };
    });
  }, []);

  /** Go directly to a specific phase */
  const goToPhase = useCallback((phase: OnboardingPhase, updates?: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, phase, ...updates }));
  }, []);

  /** Set the selected character and advance to nickname phase */
  const selectCharacter = useCallback(
    async (character: CharacterData): Promise<boolean> => {
      try {
        const res = await fetch('/api/onboarding/select-character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: character.id,
            selectionMethod: 'intuition',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) return false;

        const char: CharacterData = {
          id: data.data.character.id,
          name: data.data.character.name,
          slug: data.data.character.slug,
          avatarUrl: data.data.character.avatarUrl,
          greeting: data.data.character.greeting,
          greetingVariant: data.data.character.greetingVariant,
        };

        setState((prev) => {
          const phaseOrder = GENERIC_PHASES;
          const currentIndex = phaseOrder.indexOf(prev.phase);
          const nextPhase = phaseOrder[Math.min(currentIndex + 1, phaseOrder.length - 1)];
          return {
            ...prev,
            phase: nextPhase,
            selectedCharacter: char,
          };
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  /** Save nickname and advance */
  const saveNickname = useCallback(
    async (nickname: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/onboarding/nickname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) return false;

        setState((prev) => {
          const phaseOrder = prev.isDeepLink ? DEEP_LINK_PHASES : GENERIC_PHASES;
          const currentIndex = phaseOrder.indexOf(prev.phase);
          const nextPhase = phaseOrder[Math.min(currentIndex + 1, phaseOrder.length - 1)];
          return { ...prev, phase: nextPhase, nickname };
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  /** Complete onboarding and return redirect URL */
  const completeOnboarding = useCallback(
    async (notificationPermission: boolean | null): Promise<string> => {
      try {
        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationPermission }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return data.data.redirectTo as string;
        }
      } catch {
        // fall through
      }
      return state.redirectTo;
    },
    [state.redirectTo]
  );

  /** Add a chat message to history */
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setState((prev) => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, { role, content }],
    }));
  }, []);

  /** Increment turn counter */
  const incrementTurn = useCallback(() => {
    setState((prev) => ({ ...prev, turnIndex: prev.turnIndex + 1 }));
  }, []);

  return {
    state,
    setState,
    advance,
    goToPhase,
    selectCharacter,
    saveNickname,
    completeOnboarding,
    addMessage,
    incrementTurn,
  };
}
