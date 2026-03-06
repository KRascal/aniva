'use client';

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TutorialState {
  step: number; // 0=未開始, 1-5=各ステップ, 6=完了
  characterSlug: string;
  characterName: string;
  characterAvatar: string;
  nickname: string;
}

const TUTORIAL_STORAGE_KEY = 'aniva_tutorial_v1';
const EMPTY_STATE: TutorialState = {
  step: 0,
  characterSlug: '',
  characterName: '',
  characterAvatar: '',
  nickname: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadFromStorage(): TutorialState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TutorialState;
  } catch {
    return null;
  }
}

function saveToStorage(state: TutorialState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTutorial(
  onboardingStep?: string | null,
  sessionNickname?: string | null,
) {
  const [tutorialState, setTutorialState] = useState<TutorialState>(EMPTY_STATE);
  const [initialized, setInitialized] = useState(false);

  // Initialize: load localStorage then decide whether to start tutorial
  useEffect(() => {
    if (initialized) return;

    const stored = loadFromStorage();

    // チュートリアル完了済みならそのまま
    if (stored && stored.step >= 6) {
      setTutorialState(stored);
      setInitialized(true);
      return;
    }

    // オンボーディング未完了ならチュートリアル開始しない
    if (onboardingStep !== 'completed') {
      setTutorialState(stored ?? EMPTY_STATE);
      setInitialized(true);
      return;
    }

    // 既にチュートリアル進行中ならそのまま再開
    if (stored && stored.step > 0) {
      setTutorialState(stored);
      setInitialized(true);
      return;
    }

    // 新規: オンボーディング完了 + チュートリアル未開始 → キャラ情報取得してStep 1開始
    fetch('/api/onboarding/state')
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setInitialized(true);
          return;
        }

        const character = data.data?.character;
        const nickname = sessionNickname || data.data?.nickname || 'きみ';

        if (!character) {
          setInitialized(true);
          return;
        }

        const newState: TutorialState = {
          step: 1,
          characterSlug: character.slug ?? '',
          characterName: character.name ?? '',
          characterAvatar: character.avatarUrl ?? '',
          nickname,
        };

        saveToStorage(newState);
        setTutorialState(newState);
        setInitialized(true);
      })
      .catch(() => {
        setInitialized(true);
      });
  }, [onboardingStep, sessionNickname, initialized]);

  // Advance to next step
  const advanceTutorial = useCallback(() => {
    setTutorialState((prev) => {
      const next: TutorialState = { ...prev, step: Math.min(prev.step + 1, 6) };
      saveToStorage(next);
      return next;
    });
  }, []);

  // Skip tutorial entirely
  const skipTutorial = useCallback(() => {
    setTutorialState((prev) => {
      const next: TutorialState = { ...prev, step: 6 };
      saveToStorage(next);
      return next;
    });
  }, []);

  // Complete tutorial (step 6)
  const completeTutorial = useCallback(() => {
    setTutorialState((prev) => {
      const next: TutorialState = { ...prev, step: 6 };
      saveToStorage(next);
      return next;
    });
  }, []);

  return {
    tutorialState,
    initialized,
    advanceTutorial,
    skipTutorial,
    completeTutorial,
  };
}
