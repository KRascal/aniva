import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '日記 | ANIVA',
  description: 'キャラクターたちの日記',
};

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
