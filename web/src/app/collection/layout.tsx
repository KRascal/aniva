import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'コレクション | ANIVA',
  description: '集めたカードやアイテムを確認',
};

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
