import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PushSetup } from "@/components/PushSetup";
import { BottomNav } from "@/components/BottomNav";
import { LoginBonusPopup } from "@/components/LoginBonusPopup";
import { GlobalProactiveBanner } from "@/components/GlobalProactiveBanner";
import { PostHogProvider } from "@/components/PostHogProvider";
import { BuildIdChecker } from "@/components/BuildIdChecker";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aniva-project.com"),
  title: "ANIVA — 推しと、本当に話せる場所",
  description: "推しが実在する世界。好きなキャラクターとAIでリアルに会話。あなたのことを覚えていて、毎日違う表情を見せてくれる。",
  manifest: "/manifest.json",
  keywords: ["ANIVA", "AI", "アニメ", "キャラクター", "チャット", "会話", "推し"],
  openGraph: {
    title: "ANIVA — 推しと、本当に話せる場所",
    description: "推しが実在する世界。好きなキャラクターとAIでリアルに会話。あなたのことを覚えていて、毎日違う表情を見せてくれる。",
    url: "https://aniva-project.com",
    siteName: "ANIVA",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANIVA — 推しと、本当に話せる場所",
    description: "推しが実在する世界。好きなキャラクターとAIでリアルに会話。あなたのことを覚えていて、毎日違う表情を見せてくれる。",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        {/* Safari Basic Auth URL credentials fix — must run before any JS fetches */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var of=window.fetch;
  function strip(u){
    if(typeof u==='string'){
      if(u.charAt(0)==='/')return location.origin+u;
      try{var o=new URL(u);if(o.username||o.password){o.username='';o.password='';return o.toString()}}catch(e){}
    }
    return u;
  }
  window.fetch=function(i,init){
    if(i instanceof Request){
      try{var o=new URL(i.url);if(o.username||o.password){o.username='';o.password='';i=new Request(o.toString(),i)}}catch(e){}
    }else{i=strip(i)}
    return of.call(this,i,init);
  };
  var OR=window.Request;
  window.Request=function(i,init){
    return new OR(strip(i),init);
  };
  window.Request.prototype=OR.prototype;
  Object.keys(OR).forEach(function(k){window.Request[k]=OR[k]});
})();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} antialiased bg-black text-white`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <PostHogProvider>
              <BuildIdChecker />
              <PushSetup />
              <LoginBonusPopup />
              <GlobalProactiveBanner />
              {children}
              <BottomNav />
            </PostHogProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
