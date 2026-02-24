import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | ANIVA',
  description: 'ANIVAのプライバシーポリシーです。',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-900/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-gray-800/50 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          ANIVA
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 text-sm">プライバシーポリシー</span>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
          プライバシーポリシー
        </h1>
        <p className="text-gray-500 text-sm mb-10">最終更新日：2026年2月1日</p>

        <div className="space-y-10 text-gray-300 leading-relaxed text-sm">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">1</span>
              基本方針
            </h2>
            <p>
              ANIVA（以下「当社」）は、お客様の個人情報の保護を重要な責務と考え、個人情報保護法その他の関連法令を遵守します。
              本プライバシーポリシーは、当社が収集・利用・管理する情報の種類と方法について説明します。
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">2</span>
              収集する情報
            </h2>
            <p className="mb-3">当社は以下の情報を収集することがあります：</p>

            <div className="space-y-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wide text-purple-400">アカウント情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>メールアドレス</li>
                  <li>お名前（Googleログイン等の場合）</li>
                  <li>プロフィール画像URL（Googleログイン等の場合）</li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wide text-pink-400">利用データ</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>キャラクターとの会話履歴</li>
                  <li>関係性レベル・絆ポイントデータ</li>
                  <li>サービス利用日時・頻度</li>
                  <li>購入履歴（サブスクリプション・チップ）</li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wide text-blue-400">技術情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>IPアドレス</li>
                  <li>ブラウザ・デバイス情報</li>
                  <li>Cookieおよび類似技術</li>
                  <li>プッシュ通知トークン（同意した場合）</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">3</span>
              情報の利用目的
            </h2>
            <p>収集した情報は以下の目的で利用します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>アカウント認証・本人確認</li>
              <li>AIチャット機能の提供・改善</li>
              <li>関係性システムの運用</li>
              <li>サブスクリプション・決済の処理</li>
              <li>プッシュ通知の配信（同意した場合）</li>
              <li>カスタマーサポートの提供</li>
              <li>不正利用・スパムの検出・防止</li>
              <li>サービス品質の向上・分析</li>
              <li>法令に基づく対応</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">4</span>
              Cookie・トラッキング技術
            </h2>
            <p>
              当社はセッション管理・認証状態の維持・ユーザー体験の向上のためにCookieを使用します。
            </p>
            <div className="mt-3 bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs border-b border-gray-800 pb-2">
                <span className="text-white font-medium">Cookie名</span>
                <span className="text-white font-medium">用途</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300">next-auth.session-token</span>
                <span className="text-gray-400">認証セッション管理</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300">next-auth.csrf-token</span>
                <span className="text-gray-400">CSRFプロテクション</span>
              </div>
            </div>
            <p className="mt-3 text-gray-400">
              ブラウザの設定からCookieを無効化できますが、その場合はログインや一部機能が利用できなくなる場合があります。
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">5</span>
              決済情報の取り扱い
            </h2>
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
              <p className="text-green-300 font-medium mb-2">🔒 カード情報は当社サーバーに保存されません</p>
              <p className="text-gray-400 text-xs">
                決済処理はStripe（米国）が担当します。クレジットカード番号等の機密決済情報はStripeが安全に管理します。
                当社が保持するのは、購入履歴・サブスクリプション状態・StripeのカスタマーIDのみです。
                Stripeのプライバシーポリシーは
                <a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline ml-1">
                  stripe.com/jp/privacy
                </a>
                をご確認ください。
              </p>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">6</span>
              第三者への情報提供
            </h2>
            <p>当社は以下の場合を除き、お客様の個人情報を第三者に提供しません：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく開示義務がある場合</li>
              <li>サービス提供に必要な業務委託先（AIプロバイダー・決済サービス等）への提供</li>
              <li>統計的に処理した匿名データの提供</li>
            </ul>
            <p className="mt-3 text-gray-400">
              AIチャット機能では、会話内容がAIモデル（OpenAI等）のAPIに送信されます。
              各サービスプロバイダーのプライバシーポリシーも合わせてご確認ください。
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">7</span>
              データの保存・セキュリティ
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>個人情報は暗号化された環境で保存します。</li>
              <li>通信はすべてHTTPS（TLS）で暗号化されます。</li>
              <li>アクセス権限は最小限の担当者のみに限定します。</li>
              <li>アカウント削除後、個人データは合理的な期間内に削除します（法令に基づく保存義務がある場合を除く）。</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">8</span>
              プッシュ通知
            </h2>
            <p>
              プッシュ通知は、お客様が明示的に同意した場合にのみ有効になります。
              キャラクターからのメッセージ通知等に使用します。
              設定画面またはブラウザ設定からいつでも無効化できます。
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">9</span>
              お客様の権利
            </h2>
            <p>お客様は以下の権利を有します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li><strong className="text-white">閲覧権</strong>：保有する個人データの開示を求める権利</li>
              <li><strong className="text-white">訂正権</strong>：不正確なデータの修正を求める権利</li>
              <li><strong className="text-white">削除権</strong>：個人データの削除を求める権利</li>
              <li><strong className="text-white">利用停止権</strong>：特定の目的でのデータ利用停止を求める権利</li>
              <li><strong className="text-white">データポータビリティ権</strong>：データを機械可読形式で取得する権利</li>
            </ul>
            <p className="mt-3 text-gray-400">
              これらの権利を行使するには、サポートまでお問い合わせください。合理的な期間内に対応します。
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">10</span>
              未成年者のプライバシー
            </h2>
            <p>
              本サービスは13歳未満の方を対象としていません。
              13歳未満の方からの個人情報収集が判明した場合、速やかに削除します。
              18歳未満の方がご利用の場合、保護者が本ポリシーを確認の上、適切に管理してください。
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">11</span>
              ポリシーの変更
            </h2>
            <p>
              本ポリシーは予告なく変更される場合があります。重要な変更がある場合は、サービス内または登録メールアドレスにてお知らせします。
              変更後も継続してご利用の場合、変更後のポリシーに同意したものとみなします。
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-2">個人情報に関するお問い合わせ</h2>
            <p className="text-gray-400 text-xs">
              個人情報の取り扱いに関するご質問・苦情・開示請求等は、サービス内のサポート機能よりお問い合わせください。
              誠意を持って対応いたします。
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 ANIVA. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors text-purple-400">プライバシーポリシー</Link>
            <Link href="/" className="hover:text-gray-400 transition-colors">トップへ戻る</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
