import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '料金プラン | ANIVA',
  description: 'ANIVAのプランと料金',
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
