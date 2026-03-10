import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'モーメント | ANIVA',
  description: 'キャラクターたちの日常',
};

export default function MomentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
