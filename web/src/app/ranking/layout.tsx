import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ランキング | ANIVA',
  description: 'ファンランキング',
};

export default function RankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
