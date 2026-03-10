import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '手紙 | ANIVA',
  description: 'キャラクターからの手紙',
};

export default function LettersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
