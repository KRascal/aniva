import { auth } from './auth';

/**
 * Get authenticated user ID from session.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Get authenticated user info from session.
 */
export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    onboardingStep: (session.user as { onboardingStep?: string | null }).onboardingStep ?? null,
    nickname: (session.user as { nickname?: string | null }).nickname ?? null,
  };
}
