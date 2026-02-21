import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PushSetup } from "@/components/PushSetup";

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
  description: "アニメキャラクターと会話できるAIプラットフォーム。ルフィと毎日話そう。会話するほど絆が深まる。",
  manifest: "/manifest.json",
  keywords: ["ANIVA", "AI", "アニメ", "ルフィ", "ワンピース", "チャット", "キャラクター"],
  openGraph: {
    title: "ANIVA - 推しが実在する世界",
    description: "ルフィと毎日話そう。AIが魂を宿すキャラクターと本物の絆を築く。",
    url: "http://aniva.162.43.90.97.nip.io",
    siteName: "ANIVA",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANIVA - 推しが実在する世界",
    description: "アニメキャラクターと本当に会話できるAIプラットフォーム",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
          <PushSetup />
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
