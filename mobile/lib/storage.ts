import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession } from './api';

const SESSION_KEY = '@aniva/session';
const ACTIVE_CHARACTER_KEY = '@aniva/activeCharacter';

// ─── Session ─────────────────────────────────────────────────────────────────

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// ─── Active character ─────────────────────────────────────────────────────────

export async function saveActiveCharacter(characterId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_CHARACTER_KEY, characterId);
}

export async function getActiveCharacter(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_CHARACTER_KEY);
}

export async function clearActiveCharacter(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_CHARACTER_KEY);
}
