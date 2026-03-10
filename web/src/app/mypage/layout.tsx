import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'マイページ | ANIVA',
  description: 'プロフィールと設定',
};

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
