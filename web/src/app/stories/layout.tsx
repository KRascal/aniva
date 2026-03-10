import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ストーリー | ANIVA',
  description: 'キャラクターたちの物語',
};

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
