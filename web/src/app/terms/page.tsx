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
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800/50 px-6 py-4 flex items-center gap-4">
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
        <p className="text-gray-500 text-sm mb-10">最終更新日：2026年3月7日</p>

        <div className="space-y-10 text-gray-300 leading-relaxed text-sm">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">1</span>
              総則
            </h2>
            <p>
              本利用規約（以下「本規約」）は、株式会社K-Rascal（以下「当社」）が運営するAIキャラクター会話サービス「ANIVA」（以下「本サービス」）の利用条件を定めるものです。
              ユーザー（以下「お客様」）は、本サービスにアクセスまたは利用を開始した時点で、本規約のすべての条項に同意したものとみなします。
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
              ANIVAは、AI技術を活用してアニメ・漫画・ゲーム等のIPキャラクターとテキストおよび音声でリアルタイムに会話できるプラットフォームです。
              提供する主な機能は以下の通りです。
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>AIキャラクターとのテキストチャット</li>
              <li>AIが生成する音声メッセージ</li>
              <li>関係性レベルシステム（会話を重ねて絆を深める機能）</li>
              <li>コイン購入およびプレミアムサブスクリプション機能</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">3</span>
              利用資格・年齢制限
            </h2>
            <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-4 space-y-2 mb-4">
              <p className="text-purple-200 font-semibold">
                ⚠️ 本サービスは18歳以上の方を対象としています。
              </p>
              <p className="text-gray-400 text-xs">
                本サービスは成人向けのコンテンツを含む場合があります。18歳未満の方のご利用はお断りしております。
                お客様は本サービスへの登録・利用をもって、自身が18歳以上であることを表明・保証するものとします。
              </p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>アカウント情報（メールアドレス・パスワード）は厳重に管理し、第三者への共有を禁止します。</li>
              <li>アカウントの不正利用が判明した場合は直ちに当社へご連絡ください。</li>
              <li>一人のユーザーが複数アカウントを作成することを禁止します。</li>
              <li>法人・団体としての利用は、当社との別途合意が必要です。</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">4</span>
              コイン・サブスクリプション・課金規約
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-purple-400 mb-2">4.1 コインの定義と種類</h3>
                <p className="text-gray-400 mb-2">
                  本サービスにおける「コイン」とは、AIキャラクターとの会話、ガチャ、その他当社が定めるサービス内の機能を利用するために使用できるデジタルポイントをいいます。コインには以下の2種類があります。
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li><strong className="text-white">有償コイン：</strong>お客様が日本円またはその他の対応通貨で購入したコインです。</li>
                  <li><strong className="text-white">無償コイン：</strong>キャンペーン、ログインボーナス、お詫び等により当社が無償で付与するコインです。</li>
                </ul>
                <p className="text-gray-400 mt-2">
                  有償コインと無償コインは、お客様のアカウント上で区別して管理・表示されます。
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-purple-400 mb-2">4.2 有償コインの購入と有効期限</h3>
                <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-4 mb-3">
                  <p className="text-purple-200 font-semibold text-sm">
                    ⚠️ 有償コインの有効期限は購入日から180日間です。
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    有効期限を過ぎた有償コインは自動的に失効し、利用できなくなります。失効したコインの復元・返金・延長・再発行はいたしません。
                  </p>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>有償コインは、当社が定める料金および方法（クレジットカード等）により購入できます。</li>
                  <li>有償コインの有効期限は、各コインの<strong className="text-white">購入日（付与日）から起算して180日間</strong>です。複数回に分けて購入した場合、各購入分ごとに個別に有効期限が設定されます。</li>
                  <li>有効期限の自動延長、失効後の自動返金・再チャージ等は一切行いません。</li>
                  <li>有償コインは購入後の返金・払い戻しは原則として行いません。</li>
                  <li>有償コインは他のユーザーへの譲渡・売買・換金・現金化はできません。</li>
                  <li>お客様が退会等により本サービスの利用資格を喪失した場合、未使用の有償コインは消滅します。</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-purple-400 mb-2">4.3 コインの消費順序（FIFO）</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>コインの消費時は、<strong className="text-white">有償コインが無償コインよりも先に消費</strong>されます。</li>
                  <li>有償コイン同士の消費順序は、<strong className="text-white">購入日が古いもの（有効期限が近いもの）から順に消費</strong>されます（先入れ先出し方式：FIFO）。</li>
                  <li>お客様がコインの消費順序を任意に変更することはできません。</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-purple-400 mb-2">4.4 無償コインについて</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>無償コインは当社が任意に付与するものであり、付与条件・数量は当社の裁量で決定されます。</li>
                  <li>無償コインの有効期限は、付与時に個別に定められます。特段の定めがない場合は付与日から180日間とします。</li>
                  <li>無償コインは換金・譲渡・売買できません。</li>
                  <li>無償コインは、有償コインがすべて消費された後に消費されます。</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-pink-400 mb-2">4.5 サブスクリプション</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>有料サブスクリプションプランの料金は、月次または年次で自動更新されます。</li>
                  <li>料金は事前に明示された金額が、登録された支払い方法に請求されます。</li>
                  <li>サブスクリプションのキャンセルはいつでも可能ですが、当該請求期間内の料金は返金されません。</li>
                  <li>キャンセル後も、当該期間終了日まではプレミアム機能をご利用いただけます。</li>
                  <li>料金改定がある場合は、変更の30日前までにメールまたはサービス内通知でお知らせします。</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-blue-400 mb-2">4.6 返金・返品</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>デジタルコンテンツの性質上、原則として返金には応じません。</li>
                  <li>当社の重大な過失やシステム障害によりサービスが提供できなかった場合は、個別に対応します。</li>
                  <li>特定商取引法に基づくクーリングオフ制度は、電子商取引によるデジタルコンテンツの提供には適用されません。</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs uppercase tracking-wide text-green-400 mb-2">4.7 サービス終了時の取扱い</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>当社が本サービスを終了する場合、終了日の60日前までにお客様に通知します。</li>
                  <li>サービス終了時に未使用の有償コインがある場合、当社は未使用残高に相当する金額の払戻しを行います。払戻しの方法・期間については、サービス終了通知にてお知らせします。</li>
                  <li>無償コインについてはサービス終了時に消滅し、払戻しの対象にはなりません。</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">5</span>
              禁止事項
            </h2>
            <p>お客様は、本サービスの利用にあたり、以下の行為を行ってはなりません：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>日本法またはお客様の居住国の法律・法令に違反する行為</li>
              <li>暴力的・脅迫的・差別的・性的に露骨なコンテンツの生成を試みる行為</li>
              <li>犯罪行為を助長・扇動・賞賛するような内容をAIキャラクターに発話させる行為</li>
              <li>本サービスのシステム・データベース・APIへの不正アクセス</li>
              <li>リバースエンジニアリング・逆コンパイル・逆アセンブル・ソースコードの取得を試みる行為</li>
              <li>自動化ツール・ボット・スクレイパーを使用した大量リクエスト</li>
              <li>他のユーザーや第三者への嫌がらせ・誹謗中傷・ストーキング行為</li>
              <li>AIキャラクターを利用した詐欺・フィッシング・なりすまし行為</li>
              <li>著作権・商標権・その他の知的財産権を侵害する行為</li>
              <li>本サービスのコンテンツの無断転載・商業利用</li>
              <li>当社または第三者の評判を損なう虚偽情報の流布</li>
              <li>本規約または当社が別途定めるガイドラインに違反する行為</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">6</span>
              AIが生成するコンテンツの免責事項
            </h2>
            <p>
              本サービスで生成されるすべてのコンテンツ（テキスト・音声を含む）は、AI（人工知能）によって自動生成されます。
              当社は以下の点について一切の責任を負わないものとします。
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>AIが生成するコンテンツの正確性・完全性・信頼性・最新性</li>
              <li>AIの出力に含まれる可能性のある不正確な情報・誤解を招く表現</li>
              <li>AI生成コンテンツに依存した判断・行動により生じた損害</li>
              <li>AIモデルの改善・変更によるキャラクターの応答品質・キャラクター性の変化</li>
              <li>サービスの中断・停止・変更による損害</li>
            </ul>
            <p className="mt-3 text-gray-400">
              AI生成コンテンツは参考情報として利用してください。医療・法律・金融等の専門的なアドバイスが必要な場合は、必ず有資格の専門家にご相談ください。
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">7</span>
              知的財産権
            </h2>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
              <p className="text-white font-medium text-xs mb-2">📜 IPキャラクターに関する重要事項</p>
              <p className="text-gray-400 text-xs">
                本サービスに登場するアニメ・漫画・ゲーム等のIPキャラクターの著作権・商標権その他の知的財産権は、
                各原作者・版権元（以下「権利者」）に帰属します。当社はこれらの権利を侵害する意図はなく、
                権利者との適切な契約または合理的な二次創作の範囲においてサービスを提供しています。
              </p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>本サービスのシステム・UI・ロゴ・オリジナルコンテンツの著作権は当社に帰属します。</li>
              <li>お客様は、個人的・非商業的な目的に限り本サービスを利用できます。</li>
              <li>お客様が本サービス内で生成した会話データのコンテンツ著作権は、当社とお客様の共有とします。</li>
              <li>当社は、サービス改善・AI学習等の目的で会話データを匿名化して利用する場合があります。</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">8</span>
              アカウントの停止・終了
            </h2>
            <p>当社は、以下の場合にお客様のアカウントを停止または削除する権利を有します：</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>本規約または当社ガイドラインに違反した場合</li>
              <li>禁止事項に該当する行為を行った場合</li>
              <li>18歳未満であることが判明した場合</li>
              <li>不正な方法で課金を回避・チャージバックを申請した場合</li>
              <li>複数アカウントを作成・利用していることが判明した場合</li>
              <li>長期間（12ヶ月以上）アカウントが利用されていない場合</li>
              <li>法令または公序良俗に反する行為が確認された場合</li>
            </ul>
            <p className="mt-3 text-gray-400">
              アカウント停止・削除に際して、未使用コインおよびサブスクリプション残余期間の返金は行いません（当社の重大な過失による場合を除く）。
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">9</span>
              サービスの変更・終了
            </h2>
            <p>
              当社は、事前の通知なしにサービスの内容を変更・停止・終了する権利を留保します。
              重要な変更が生じる場合は、可能な限り事前にお知らせします。
              サービス終了の際は、お客様のデータ取り出しのために合理的な猶予期間（原則として30日以上）を設けます。
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">10</span>
              免責・責任の制限
            </h2>
            <p>
              本サービスは現状有姿（AS IS）で提供されます。当社は本サービスの完全性・有用性・特定目的への適合性・無中断性を保証しません。
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-gray-400">
              <li>当社の損害賠償責任は、お客様が過去12ヶ月に支払った料金を上限とします。</li>
              <li>間接損害・逸失利益・データ損失・精神的損害について当社は責任を負いません。</li>
              <li>第三者のサービス（AI API、決済サービス等）の障害による損害について当社は責任を負いません。</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/40 flex items-center justify-center text-xs text-purple-300 font-bold">11</span>
              規約の変更
            </h2>
            <p>
              当社は本規約をいつでも更新する権利を有します。重要な変更がある場合は、変更の14日前までにメールまたはサービス内通知でお知らせします。
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
              本規約は日本法に準拠します。本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-2">運営者情報・お問い合わせ</h2>
            <dl className="space-y-1 text-gray-400 text-xs">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 shrink-0">運営会社</dt>
                <dd>株式会社K-Rascal</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 shrink-0">所在地</dt>
                <dd>東京都港区港南1-6-33 11F</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 shrink-0">サービス名</dt>
                <dd>ANIVA</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-20 shrink-0">お問い合わせ</dt>
                <dd>info@k-rascal.win</dd>
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
            <Link href="/terms" className="hover:text-purple-400 transition-colors text-purple-400">利用規約</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/legal/tokushoho" className="hover:text-purple-400 transition-colors">特定商取引法に基づく表記</Link>
            <Link href="/" className="hover:text-gray-400 transition-colors">トップへ戻る</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
