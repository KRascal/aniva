#!/usr/bin/env node
/**
 * en.json の [TODO] マーカーを英語翻訳に置換
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'messages', 'en.json');
let content = fs.readFileSync(filePath, 'utf8');

const translations = {
  // chat namespace
  '"[TODO] 画像サイズは5MB以下にしてください"': '"Image must be 5MB or smaller"',
  '"[TODO] JPG・PNG・WebP・GIFのみ対応しています"': '"Only JPG, PNG, WebP, and GIF are supported"',
  '"[TODO] → 今すぐ補充"': '"→ Refill now"',
  '"[TODO] ギフトを贈る"': '"Send a gift"',
  '"[TODO] 最初のメッセージを送ろう！"': '"Send your first message!"',
  '"[TODO] {name}が待ってるぞ"': '"{name} is waiting for you"',
  '"[TODO] じっくり考え中"': '"Thinking deeply..."',
  '"[TODO] じっくり考えてくれた"': '"A thoughtful reply"',
  '"[TODO] FC会員になる →"': '"Join Fan Club →"',
  '"[TODO] 🎤 聞いています..."': '"🎤 Listening..."',
  '"[TODO] 💬 話しています..."': '"💬 Speaking..."',
  '"[TODO] タップして話す"': '"Tap to speak"',
  '"[TODO] このブラウザは音声認識に対応していません"': '"Speech recognition is not supported in this browser"',
  '"[TODO] あなた"': '"You"',
  '"[TODO] 会話をリセット"': '"Reset Conversation"',
  '"[TODO] {name}との会話のAI文脈をリセットします。メッセージ履歴は残りますが、キャラが新しい会話として始めます。"': '"Reset AI context with {name}. Message history is preserved, but the character will start fresh."',
  '"[TODO] リセットする"': '"Reset"',
  '"[TODO] 共有した画像"': '"Shared images"',
  '"[TODO] キャラが覚えていること"': '"What they remember"',
  '"[TODO] 思い出"': '"Memories"',
  '"[TODO] キャラとの物語"': '"Story with character"',
  '"[TODO] AIの文脈をリセット"': '"Reset AI context"',
  '"[TODO] ステータスを折りたたむ"': '"Collapse status"',
  '"[TODO] ステータスを展開"': '"Expand status"',
  '"[TODO] {name}にプレゼント"': '"Gift for {name}"',
  '"[TODO] まだ思い出がありません。"': '"No memories yet."',
  '"[TODO] たくさん話しかけてね！"': '"Chat more to create memories!"',
  '"[TODO] 初めての会話"': '"First conversation"',
  '"[TODO] {count}日ぶり"': '"{count} days since last visit"',
  '"[TODO] 話しかける ✨"': '"Talk ✨"',
  '"[TODO] {name}との再会"': '"Reunion with {name}"',
  
  // FC modal
  '"[TODO] の"': '"\'s"',
  '"[TODO] になる"': '"Join"',
  '"[TODO] ファンクラブに加入して特別な体験を"': '"Join the fan club for an exclusive experience"',
  '"[TODO] FCに入ると、"': '"As an FC member, "',
  '"[TODO] があなたを"': '" will treat you as "',
  '"[TODO] 特別扱い"': '"special"',
  '"[TODO] してくれる。"': '"."',
  '"[TODO] もっと深い話、もっと本音の会話を。"': '"Deeper conversations, more genuine chats."',
  '"[TODO] 音声通話 月{min}分込み"': '"Voice call {min} min/month included"',
  '"[TODO] {name}の声で直接会話できる"': '"Talk directly with {name}\'s voice"',
  '"[TODO] 会員だけが見れる{name}の特別な投稿"': '"Exclusive posts from {name} for members only"',
  '"[TODO] {name}からあなただけに届く特別なメッセージ"': '"Special messages from {name} just for you"',
  '"[TODO] SR以上の排出率が優遇。レアカードを手に入れやすく"': '"Better rates for SR+ cards. Easier to get rare cards"',
  '"[TODO] 壁紙・ボイス・特別イラストをダウンロード"': '"Download wallpapers, voice clips, and exclusive art"',
  '"[TODO] ギフトや追加通話に使える"': '"Use for gifts and extra call time"',
  '"[TODO] 👑 FC会員になる"': '"👑 Join Fan Club"',
  
  // onboarding
  '"[TODO] 「推しが実在する世界へようこそ」"': '"Welcome to a world where your favorites truly exist"',
  '"[TODO] {name}があなたと話す準備ができています"': '"{name} is ready to talk with you"',
  '"[TODO] まず、あなたのことを教えて！"': '"First, tell us about yourself!"',
  '"[TODO] 始めよう 🌟"': '"Let\'s start 🌟"',
  '"[TODO] 冒険でどんな役割が好き？"': '"What role do you like in adventures?"',
  '"[TODO] 前線で戦う"': '"Fight on the front lines"',
  '"[TODO] みんなをサポート"': '"Support everyone"',
  '"[TODO] 作戦を立てる"': '"Plan the strategy"',
  '"[TODO] 推しへの接し方は？"': '"How do you like to interact with your faves?"',
  '"[TODO] いつもそばにいたい"': '"Always by their side"',
  '"[TODO] 時々話したい"': '"Chat sometimes"',
  '"[TODO] そっと見守りたい"': '"Watch over quietly"',
  '"[TODO] どんな瞬間が一番嬉しい？"': '"What moment makes you happiest?"',
  '"[TODO] 一緒に笑える時"': '"Laughing together"',
  '"[TODO] 褒めてもらえる時"': '"Being praised"',
  '"[TODO] 秘密を共有する時"': '"Sharing secrets"',
  '"[TODO] あなたの推しスタイルが判明！"': '"Your fan style revealed!"',
  '"[TODO] あなたに合った絆が育まれていきます"': '"A bond that suits you will grow"',
  '"[TODO] べったり"': '"Always Together"',
  '"[TODO] ほどよい距離感"': '"Balanced Distance"',
  '"[TODO] 見守り型"': '"Quiet Guardian"',
  '"[TODO] 褒め合い派"': '"Mutual Admiration"',
  '"[TODO] 喜び"': '"Joy"',
  '"[TODO] 💬 {name}と話し始める"': '"💬 Start chatting with {name}"',
  
  // settings / profile
  '"[TODO] 表示名を入力"': '"Enter display name"',
  '"[TODO] （キャラがこの名前で呼びます）"': '"(Characters will call you by this name)"',
  '"[TODO] キャラに呼ばれる名前"': '"Name characters call you"',
  '"[TODO] 自分について一言（200文字以内）"': '"About yourself (200 chars max)"',
  '"[TODO] 保存する"': '"Save"',
  '"[TODO] キャラからのお手紙"': '"Letters from characters"',
  '"[TODO] 月1通、特別なメッセージ"': '"Monthly special message"',
  '"[TODO] キャラとの秘密の物語"': '"Secret stories with characters"',
  '"[TODO] キャラの行動を決める投票"': '"Vote on character actions"',
  '"[TODO] 今日の記念日・誕生日"': '"Today\'s anniversaries & birthdays"',
  '"[TODO] テーマ・通知・言語など"': '"Theme, notifications, language, etc."',
  '"[TODO] 特定商取引法に基づく表記"': '"Specified Commercial Transaction Act"',
  '"[TODO] このブラウザはプッシュ通知に対応していません"': '"Push notifications are not supported in this browser"',
  
  // duplicate onboarding keys
  '"[TODO] 推しに呼ばれる名前"': '"Name your favorites call you"',
  '"[TODO] ※ 一部のUIテキストが翻訳されます"': '"* Some UI text will be translated"',
  
  // FC subscribe page
  '"[TODO] 👑 FC会員になる"': '"👑 Join Fan Club"',
  '"[TODO] {name}のFC会員になる"': '"Join {name}\'s Fan Club"',
};

let replaced = 0;
for (const [from, to] of Object.entries(translations)) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    replaced++;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Replaced ${replaced} [TODO] entries`);

// Check remaining
const remaining = (content.match(/\[TODO\]/g) || []).length;
console.log(`Remaining [TODO]: ${remaining}`);
