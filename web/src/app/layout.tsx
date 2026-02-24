import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PushSetup } from "@/components/PushSetup";
import { BottomNav } from "@/components/BottomNav";

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
    url: "https://aniva-project.com",
    images: [
      {
        url: "https://aniva-project.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "ANIVA - 推しが実在する世界",
      },
    ],
    siteName: "ANIVA",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANIVA - 推しが実在する世界",
    description: "アニメキャラクターと本当に会話できるAIプラットフォーム",
    images: ["https://aniva-project.com/og-image.png"],
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
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <Providers>
          <PushSetup />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
