import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ANIVA — はじめましょう',
  description: 'ANIVAへようこそ',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 全画面黒背景、ナビゲーション非表示
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {children}
    </div>
  );
}
