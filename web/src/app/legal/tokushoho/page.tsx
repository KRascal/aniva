import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | ANIVA',
  description: 'ANIVAの特定商取引法に基づく表記です。',
};

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800/50 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          ANIVA
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 text-sm">特定商取引法に基づく表記</span>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
          特定商取引法に基づく表記
        </h1>
        <p className="text-gray-500 text-sm mb-10">最終更新日：2026年3月7日</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <Section title="販売事業者">
            <p>株式会社K-Rascal</p>
          </Section>

          <Section title="代表者">
            <p>新井 瑞穂</p>
          </Section>

          <Section title="所在地">
            <p>東京都港区港南1-6-33 11F</p>
          </Section>

          <Section title="電話番号">
            <p>請求があった場合に遅滞なく開示いたします。</p>
          </Section>

          <Section title="メールアドレス">
            <p>info@k-rascal.win</p>
          </Section>

          <Section title="販売URL">
            <p>https://aniva-project.com</p>
          </Section>

          <Section title="販売価格">
            <p>各商品・サービスのページに表示された価格に準じます。</p>
            <p>表示価格はすべて税込みです。</p>
          </Section>

          <Section title="商品代金以外の必要料金">
            <p>インターネット接続に必要な通信費はお客様のご負担となります。</p>
          </Section>

          <Section title="支払方法">
            <p>クレジットカード（Stripe経由）</p>
          </Section>

          <Section title="支払時期">
            <p>購入手続き完了時に即時決済されます。</p>
            <p>サブスクリプションは契約期間ごとに自動更新・自動課金されます。</p>
          </Section>

          <Section title="商品の引渡し時期">
            <p>デジタルコンテンツ：決済完了後、即時利用可能です。</p>
            <p>コイン：決済完了後、即時アカウントに反映されます。</p>
          </Section>

          <Section title="コインの有効期限">
            <p>有償コインの有効期限は購入日から180日間です。</p>
            <p>有効期限を過ぎた有償コインは自動的に失効し、返金・復元・延長はいたしません。</p>
            <p>無償コインの有効期限は付与時に個別に定められます。</p>
          </Section>

          <Section title="返品・キャンセルについて">
            <p>デジタルコンテンツの性質上、購入後の返品・返金はお受けしておりません。</p>
            <p>ただし、サービスの不具合等により正常にご利用いただけなかった場合は、お問い合わせください。</p>
            <p>サブスクリプションは次回更新日の前日までにキャンセル可能です。キャンセル後も契約期間終了まではサービスをご利用いただけます。</p>
          </Section>

          <Section title="動作環境">
            <p>推奨ブラウザ：Google Chrome、Safari、Firefox、Microsoft Edge（最新版）</p>
            <p>推奨デバイス：スマートフォン、タブレット、PC</p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 株式会社K-Rascal. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/legal/tokushoho" className="hover:text-purple-400 transition-colors text-purple-400">特定商取引法に基づく表記</Link>
            <Link href="/" className="hover:text-gray-400 transition-colors">トップへ戻る</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/5 pb-4">
      <h2 className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wider">{title}</h2>
      <div className="text-white/80">{children}</div>
    </div>
  );
}
