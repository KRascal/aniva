import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '探索 | ANIVA',
  description: '新しいキャラクターを発見しよう',
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
