import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'イベント | ANIVA',
  description: '開催中のイベント情報',
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
