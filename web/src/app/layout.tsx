import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ANIVA - 推しが実在する世界",
  description: "アニメキャラクターのOnlyFans × デジタルツイン プラットフォーム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ANIVA",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <Providers>
          {children}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex justify-around items-center h-14 safe-area-bottom">
            <a
              href="/chat"
              className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <span className="text-xl">💬</span>
              <span className="text-[10px]">チャット</span>
            </a>
            <a
              href="/moments"
              className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <span className="text-xl">📸</span>
              <span className="text-[10px]">タイムライン</span>
            </a>
          </nav>
          <div className="h-14" />
        </Providers>
      </body>
    </html>
  );
}
