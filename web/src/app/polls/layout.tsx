import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投票 | ANIVA',
  description: 'キャラクターの投票に参加しよう',
};

export default function PollsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
