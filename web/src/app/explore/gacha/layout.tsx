import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ガチャ | ANIVA',
  description: 'ガチャを引いてレアカードを手に入れよう',
};

export default function GachaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
