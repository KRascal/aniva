import { getSession } from './storage';

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://aniva.162.43.90.97.nip.io';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  avatar?: string;
  personality?: string;
  voiceEnabled?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  createdAt: string;
}

export interface ChatResponse {
  message: Message;
  audioUrl?: string;
}

export interface Moment {
  id: string;
  characterId: string;
  characterName: string;
  characterImage?: string;
  content: string;
  imageUrl?: string;
  isLocked: boolean;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Relationship {
  characterId: string;
  level: number;
  experiencePoints: number;
  nextLevelXp: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginWithCredentials(
  email: string,
  password?: string,
): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/callback/credentials', {
    method: 'POST',
    body: JSON.stringify({ email, password: password ?? '' }),
  });
}

// ─── Characters ──────────────────────────────────────────────────────────────

export async function fetchCharacters(): Promise<Character[]> {
  return request<Character[]>('/api/characters');
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function sendMessage(
  characterId: string,
  content: string,
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ characterId, content }),
  });
}

export async function fetchChatHistory(
  characterId: string,
): Promise<Message[]> {
  return request<Message[]>(`/api/chat/history/${characterId}`);
}

// ─── Moments ─────────────────────────────────────────────────────────────────

export async function fetchMoments(): Promise<Moment[]> {
  return request<Moment[]>('/api/moments');
}

export async function reactToMoment(
  momentId: string,
  emoji: string = '❤️',
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/moments/${momentId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

// ─── Relationships ───────────────────────────────────────────────────────────

export async function fetchRelationship(
  characterId: string,
): Promise<Relationship> {
  return request<Relationship>(`/api/relationship/${characterId}`);
}
