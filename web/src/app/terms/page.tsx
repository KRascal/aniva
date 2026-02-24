import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 | ANIVA',
  description: 'ANIVAの利用規約です。',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-3xl" />
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
        <span className="text-gray-400 text-sm">利用規約</span>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
          利用規約
        </h1>
        <p className="text-gray-500 text-sm mb-10">最終更新日：2026年2月1日</p>

        <div className="space-y-10 text-gray-300 leading-relaxed text-sm">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">1</span>
              はじめに
            </h2>
            <p>
              本利用規約（以下「本規約」）は、ANIVA（以下「当社」または「本サービス」）が提供するアニメキャラクターAIチャットプラットフォームの利用条件を定めるものです。
              ユーザー（以下「お客様」）は、本サービスにアクセスまたは利用することにより、本規約に同意したものとみなします。
              本規約に同意できない場合は、本サービスのご利用をお控えください。
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">2</span>
              サービスの概要
            </h2>
            <p>
              ANIVAは、AIを活用してアニメ・漫画・ゲーム等のキャラクターとチャット形式で会話できるプラットフォームです。
              提供する主な機能は以下の通りです。
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>AIキャラクターとのテキストチャット</li>
              <li>AIが生成する音声メッセージ</li>
              <li>関係性レベルシステム（会話を重ねて絆を深める機能）</li>
              <li>プレミアムサブスクリプションおよびチップ機能</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">3</span>
              フィクションキャラクターに関する重要事項
            </h2>
            <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-4 space-y-2">
              <p className="text-purple-200 font-medium">
                ⚠️ 本サービスで提供されるすべてのキャラクターはフィクションです。
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
                <li>AIキャラクターは、実在の人物ではなく架空の存在です。</li>
                <li>キャラクターの発言・行動・感情はAIが生成したものであり、実際の意思・感情・意見を持ちません。</li>
                <li>キャラクターの知的財産権は原作者・版権元に帰属します。ANIVAはこれらを尊重した二次的利用の範囲でサービスを提供します。</li>
                <li>キャラクターとの会話内容を現実の人物・事象と混同しないようご注意ください。</li>
                <li>AIとの会話に過度に依存することなく、現実の人間関係も大切にしてください。</li>
              </ul>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">4</span>
              AIが生成するコンテンツの免責事項
            </h2>
            <p>
              本サービスで生成されるすべてのコンテンツ（テキスト・音声を含む）は、AI（人工知能）によって自動生成されます。
              当社は以下の点について責任を負わないものとします。
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>AIが生成するコンテンツの正確性・完全性・信頼性</li>
              <li>AIの出力に含まれる可能性のある不正確な情報・誤解を招く表現</li>
              <li>AI生成コンテンツに依存した行動による損害</li>
              <li>サービスの中断・停止・変更による損害</li>
              <li>AIモデルの改善・変更によるキャラクターの応答品質の変化</li>
            </ul>
            <p className="mt-3 text-gray-400">
              AI生成コンテンツは参考情報として利用し、重要な判断の根拠にはしないでください。
              医療・法律・金融等の専門的なアドバイスが必要な場合は、必ず有資格の専門家にご相談ください。
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">5</span>
              利用資格・アカウント
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>本サービスは13歳以上の方を対象とします。18歳未満の方は保護者の同意の下でご利用ください。</li>
              <li>アカウント情報（メールアドレス・パスワード）は適切に管理し、第三者への共有を禁止します。</li>
              <li>アカウントの不正利用が判明した場合は直ちにご連絡ください。</li>
              <li>一人のユーザーが複数アカウントを作成することを禁止します。</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">6</span>
              禁止事項
            </h2>
            <p>以下の行為を禁止します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>法律・法令に違反する行為</li>
              <li>他のユーザーや第三者への嫌がらせ・誹謗中傷</li>
              <li>AIキャラクターを使った詐欺・なりすまし行為</li>
              <li>サービスへの不正アクセス・リバースエンジニアリング</li>
              <li>スパムや自動化ツールを使った大量リクエスト</li>
              <li>未成年者に有害なコンテンツの生成を試みる行為</li>
              <li>著作権・商標権等の知的財産権を侵害する行為</li>
              <li>本サービスのコンテンツの無断転載・商業利用</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">7</span>
              料金・決済・返金
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>無料プランと有料サブスクリプションプランがあります。</li>
              <li>有料プランの料金は事前に明示され、月次または年次で請求されます。</li>
              <li>サブスクリプションは解約するまで自動更新されます。</li>
              <li>チップ（投げ銭）機能による支払いは原則返金不可です。</li>
              <li>サブスクリプションのキャンセルはいつでも可能ですが、当該期間内の料金は返金されません。</li>
              <li>サービス障害等、当社の責に帰すべき事由がある場合は個別に対応します。</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">8</span>
              知的財産権
            </h2>
            <p>
              本サービスのシステム・UI・ロゴ・オリジナルコンテンツの著作権は当社に帰属します。
              お客様は、個人的・非商業的な目的に限り本サービスを利用できます。
              なお、本サービスに登場するアニメキャラクターの著作権は各原作者・版権元に帰属し、
              当社はファンサービスとして合理的な範囲でこれらを利用しています。
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">9</span>
              サービスの変更・終了
            </h2>
            <p>
              当社は事前通知なしにサービスの内容を変更・停止・終了する権利を留保します。
              重要な変更が生じる場合は、可能な限り事前にお知らせします。
              サービス終了の際は、お客様のデータ取り出しのために合理的な猶予期間を設けます。
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">10</span>
              免責・責任の制限
            </h2>
            <p>
              本サービスは現状有姿（AS IS）で提供されます。当社は本サービスの完全性・有用性・特定目的への適合性を保証しません。
              当社の損害賠償責任は、お客様が過去12ヶ月に支払った料金を上限とします。
              間接損害・逸失利益・データ損失について当社は責任を負いません。
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">11</span>
              規約の変更
            </h2>
            <p>
              当社は本規約をいつでも更新する権利を有します。重要な変更がある場合はメールまたはサービス内通知でお知らせします。
              変更後も継続してサービスをご利用の場合、変更後の規約に同意したものとみなします。
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">12</span>
              準拠法・管轄
            </h2>
            <p>
              本規約は日本法に準拠し、本規約に関する紛争は東京地方裁判所を第一審の専属管轄裁判所とします。
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-2">お問い合わせ</h2>
            <p className="text-gray-400 text-xs">
              本規約に関するご質問は、サービス内のサポート機能またはメールにてお問い合わせください。
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© 2026 ANIVA. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-purple-400 transition-colors text-purple-400">利用規約</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/" className="hover:text-gray-400 transition-colors">トップへ戻る</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
