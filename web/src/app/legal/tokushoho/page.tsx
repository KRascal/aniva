'use client';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-8">特定商取引法に基づく表記</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <Section title="販売事業者">
            <p>株式会社K-Rascal</p>
          </Section>

          <Section title="代表者">
            <p>新井 瑞穂</p>
          </Section>

          <Section title="所在地">
            <p>請求があった場合に遅滞なく開示いたします。</p>
          </Section>

          <Section title="電話番号">
            <p>請求があった場合に遅滞なく開示いたします。</p>
          </Section>

          <Section title="メールアドレス">
            <p>support@aniva-project.com</p>
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

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-white/40">
          <p>最終更新日: 2026年3月7日</p>
        </div>
      </div>
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
