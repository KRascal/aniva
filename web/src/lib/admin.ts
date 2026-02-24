import { auth } from './auth';

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<{ email: string; id: string } | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const ok = await isAdminEmail(session.user.email);
  if (!ok) return null;
  return { email: session.user.email, id: (session.user as any).id };
}
