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
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800/50 px-6 py-4 flex items-center gap-4">
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
        <p className="text-gray-500 text-sm mb-10">最終更新日：2026年3月7日</p>

        <div className="space-y-10 text-gray-300 leading-relaxed text-sm">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">1</span>
              基本方針
            </h2>
            <p>
              株式会社K-Rascal（以下「当社」）は、ANIVAサービスの運営にあたり、お客様の個人情報の保護を重要な責務と考えます。
              当社は個人情報の保護に関する法律（個人情報保護法）その他の関連法令を遵守し、
              お客様の個人情報を適切に管理・保護します。
              本プライバシーポリシーは、当社が収集・利用・管理する情報の種類と方法について説明します。
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">2</span>
              収集する個人情報
            </h2>
            <p className="mb-3">当社は以下の情報を収集します：</p>

            <div className="space-y-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-xs uppercase tracking-wide text-purple-400">アカウント情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>メールアドレス（アカウント登録・認証に使用）</li>
                  <li>ニックネーム・表示名</li>
                  <li>プロフィール画像URL（GoogleやSNSログイン時）</li>
                  <li>パスワード（ハッシュ化して保存。平文では保存しません）</li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-xs uppercase tracking-wide text-pink-400">会話・利用データ</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>AIキャラクターとの会話履歴（テキスト）</li>
                  <li>関係性レベル・絆ポイントデータ</li>
                  <li>サービス利用日時・頻度・利用機能</li>
                  <li>キャラクター選択・設定データ</li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-xs uppercase tracking-wide text-green-400">決済情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>コイン購入履歴・サブスクリプション状態</li>
                  <li>StripeカスタマーID（決済管理用の識別子）</li>
                  <li>クレジットカード番号等の機密情報はStripeが管理し、当社サーバーには保存しません</li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-xs uppercase tracking-wide text-blue-400">技術情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>IPアドレス</li>
                  <li>ブラウザ種別・バージョン・デバイス情報</li>
                  <li>CookieおよびWebストレージ</li>
                  <li>プッシュ通知トークン（通知を許可した場合）</li>
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
            <p>収集した情報は以下の目的に限り利用します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>アカウント認証・本人確認・セキュリティ管理</li>
              <li>AIチャット機能・音声機能の提供</li>
              <li>関係性システム・ゲーミフィケーション機能の運用</li>
              <li>コイン購入・サブスクリプション決済の処理</li>
              <li>プッシュ通知の配信（お客様が許可した場合のみ）</li>
              <li>カスタマーサポートの提供・問い合わせへの対応</li>
              <li>不正利用・スパム・セキュリティ脅威の検出・防止</li>
              <li>サービス品質の向上・新機能の開発・統計分析</li>
              <li>法令上の義務の履行</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">4</span>
              第三者への情報提供
            </h2>
            <p>当社は、以下の場合を除き、お客様の個人情報を第三者に提供しません：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>お客様の明示的な同意がある場合</li>
              <li>法令・裁判所命令・行政機関の要請に基づく開示義務がある場合</li>
              <li>サービス提供に必要な業務委託先への提供（下記参照）</li>
              <li>統計的に処理・匿名化したデータの提供</li>
            </ul>

            <div className="mt-4 space-y-3">
              <p className="text-white font-semibold text-xs">主なサービスプロバイダーとの情報共有：</p>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-purple-300 font-medium text-xs mb-1">Stripe（決済処理）</p>
                  <p className="text-gray-400 text-xs">コイン購入・サブスクリプション決済を処理します。決済情報はStripeが管理します。プライバシーポリシー：<a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">stripe.com/jp/privacy</a></p>
                </div>
                <div>
                  <p className="text-purple-300 font-medium text-xs mb-1">ElevenLabs（音声生成）</p>
                  <p className="text-gray-400 text-xs">AIキャラクターの音声メッセージ生成に使用します。会話内容の一部が送信される場合があります。プライバシーポリシー：<a href="https://elevenlabs.io/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">elevenlabs.io/privacy</a></p>
                </div>
                <div>
                  <p className="text-purple-300 font-medium text-xs mb-1">AI APIプロバイダー（OpenAI等）</p>
                  <p className="text-gray-400 text-xs">AIキャラクターとの会話生成に使用します。会話内容がAPIに送信されます。各プロバイダーのプライバシーポリシーもご確認ください。</p>
                </div>
                <div>
                  <p className="text-purple-300 font-medium text-xs mb-1">PostHog（アクセス解析）</p>
                  <p className="text-gray-400 text-xs">サービスの利用状況の分析・改善のために使用します。匿名化されたイベントデータを収集します。プライバシーポリシー：<a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">posthog.com/privacy</a></p>
                </div>
              </div>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">5</span>
              Cookie・分析ツール
            </h2>
            <p>
              当社はセッション管理・認証状態の維持・ユーザー体験の向上のためにCookieおよびWebストレージを使用します。
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
              <div className="flex justify-between text-xs">
                <span className="text-purple-300">next-auth.callback-url</span>
                <span className="text-gray-400">ログイン後リダイレクト先</span>
              </div>
            </div>
            <p className="mt-3 text-gray-400">
              ブラウザの設定からCookieを無効化できますが、その場合はログインや一部機能が利用できなくなります。
              当社はアクセス解析のため、アクセスログを収集する場合があります。ログはIPアドレスを含みますが、個人識別のみには使用しません。
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">6</span>
              データ保持期間
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong className="text-white">アカウント情報：</strong>アカウント削除の申請後、30日以内に削除します。</li>
              <li><strong className="text-white">会話履歴：</strong>アカウント削除後90日以内に削除します（バックアップからの完全削除には最大180日かかる場合があります）。</li>
              <li><strong className="text-white">決済・購入履歴：</strong>税務・会計上の義務により、最終取引から7年間保持します。コイン（前払式支払手段）の有効期限は購入日から180日間です。</li>
              <li><strong className="text-white">アクセスログ：</strong>セキュリティ目的で最大90日間保持します。</li>
              <li>法令に基づく保存義務がある情報は、当該期間中は削除できません。</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">7</span>
              データのセキュリティ
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>個人情報は暗号化された環境（AES-256等）で保存します。</li>
              <li>通信はすべてHTTPS（TLS 1.2以上）で暗号化されます。</li>
              <li>アクセス権限は必要最小限の担当者のみに限定します。</li>
              <li>定期的なセキュリティ監査を実施します。</li>
              <li>セキュリティインシデントが発生した場合は、速やかにお客様および関係機関に通知します。</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">8</span>
              お客様の権利
            </h2>
            <p>お客様は以下の権利を有します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li><strong className="text-white">開示請求権：</strong>当社が保有するお客様の個人情報の開示を求める権利</li>
              <li><strong className="text-white">訂正・追加・削除請求権：</strong>不正確・不完全なデータの修正または削除を求める権利</li>
              <li><strong className="text-white">利用停止・消去請求権：</strong>個人情報の利用停止または削除を求める権利</li>
              <li><strong className="text-white">第三者提供停止請求権：</strong>第三者へのデータ提供の停止を求める権利</li>
              <li><strong className="text-white">データポータビリティ権：</strong>お客様のデータを機械可読形式で受け取る権利</li>
            </ul>
            <p className="mt-3 text-gray-400">
              これらの権利を行使するには、下記お問い合わせ先までご連絡ください。原則として受付後30日以内に対応します。
              一部の権利については、法令上の制限がある場合があります。
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">9</span>
              プッシュ通知
            </h2>
            <p>
              プッシュ通知は、お客様が明示的に許可した場合にのみ有効になります。
              キャラクターからのメッセージ通知等に使用します。
              設定画面またはブラウザ設定からいつでも通知を無効化できます。無効化後は通知トークンを削除します。
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">10</span>
              未成年者のプライバシー
            </h2>
            <p>
              本サービスは18歳以上の方を対象としています。
              18歳未満の方からの個人情報収集が判明した場合、速やかにアカウントを停止し、関連データを削除します。
              お子様を持つ保護者の方は、本サービスへのアクセスを適切に管理してください。
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600/40 flex items-center justify-center text-xs text-pink-300 font-bold">11</span>
              本ポリシーの変更
            </h2>
            <p>
              本ポリシーは予告なく変更される場合があります。重要な変更がある場合は、変更の14日前までにサービス内または登録メールアドレスにてお知らせします。
              変更後も継続してご利用の場合、変更後のポリシーに同意したものとみなします。
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-3">個人情報保護管理者・お問い合わせ</h2>
            <dl className="space-y-1 text-gray-400 text-xs">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">管理者</dt>
                <dd>株式会社K-Rascal 個人情報保護担当</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">サービス名</dt>
                <dd>ANIVA</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">所在地</dt>
                <dd>東京都港区港南1-6-33 11F</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">お問い合わせ</dt>
                <dd>info@k-rascal.win<br />個人情報の開示・訂正・削除・利用停止の請求も同様にご連絡ください。</dd>
              </div>
            </dl>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 株式会社K-Rascal. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors text-purple-400">プライバシーポリシー</Link>
            <Link href="/legal/tokushoho" className="hover:text-purple-400 transition-colors">特定商取引法に基づく表記</Link>
            <Link href="/" className="hover:text-gray-400 transition-colors">トップへ戻る</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
