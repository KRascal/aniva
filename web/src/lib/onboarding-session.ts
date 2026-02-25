/**
 * ANIVA オンボーディングセッション管理
 * 未ログインユーザーのゲストセッションをsessionStorageで管理
 */

const GUEST_SESSION_KEY = 'aniva_guest_session';

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

export type OnboardingStep =
  | 'summoning'
  | 'encounter'
  | 'chat'
  | 'promise'
  | 'complete';

export interface GuestMessage {
  role: 'user' | 'character';
  content: string;
  createdAt: string; // ISO string
}

export interface GuestOnboardingState {
  characterSlug: string;
  meetDate: string; // ISO string
  chatHistory: GuestMessage[];
  step: OnboardingStep;
}

export function saveGuestState(state: GuestOnboardingState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(
    `aniva_onboarding_${state.characterSlug}`,
    JSON.stringify(state)
  );
}

export function loadGuestState(slug: string): GuestOnboardingState | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(`aniva_onboarding_${slug}`);
  return raw ? JSON.parse(raw) : null;
}

export function clearGuestState(slug: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`aniva_onboarding_${slug}`);
}
