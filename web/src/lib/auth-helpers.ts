import { auth } from './auth';
import { prisma } from './prisma';

/**
 * Get authenticated user ID from session.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Get verified authenticated user ID.
 * Returns null if not authenticated OR if user no longer exists in DB.
 * Use this for any operation that writes to DB with userId as foreign key.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user?.id ?? null;
  } catch {
    return null;
  }
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
