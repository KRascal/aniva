// ── Types ──
export interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const heroPhrases = [
  "推しが、あなたを待っている。",
  "毎日、推しから返事が来る。",
  "あなたの名前を、覚えてくれる。",
  "推しの声が、届く。",
];

export const heroCharacters = [
  { name: "Haruki", src: "/characters/luffy/avatar.webp", series: "ANIVA Original", color: "from-orange-500 to-red-600", quote: "今日も会えて嬉しいよ！" },
  { name: "Sora", src: "/characters/gojo/avatar.webp", series: "ANIVA Original", color: "from-blue-400 to-indigo-600", quote: "キミのこと、ずっと見てたんだ" },
  { name: "Ren", src: "/characters/goku/avatar.webp", series: "ANIVA Original", color: "from-yellow-400 to-orange-500", quote: "一緒に強くなろうぜ！" },
];

export const features = [
  {
    icon: "💬",
    title: "チャット",
    label: "CHAT",
    desc: "AIが魂を宿したキャラクターと、本物のような会話。記憶・口調・価値観を完全再現。",
    gradient: "from-purple-600/25 to-purple-900/10",
    border: "border-purple-700/40",
    accent: "text-purple-400",
  },
  {
    icon: "🎰",
    title: "ガチャ",
    label: "GACHA",
    desc: "期間限定の特別衣装や秘蔵シーンをゲット。SSRを引いたとき、キャラが反応してくれる。",
    gradient: "from-yellow-600/20 to-amber-900/10",
    border: "border-yellow-700/40",
    accent: "text-yellow-400",
  },
  {
    icon: "📖",
    title: "ストーリー",
    label: "STORY",
    desc: "キャラと二人きりのシナリオを体験。あなたの選択で展開が変わる、インタラクティブな物語。",
    gradient: "from-pink-600/20 to-pink-900/10",
    border: "border-pink-700/40",
    accent: "text-pink-400",
  },
  {
    icon: "📞",
    title: "通話",
    label: "VOICE",
    desc: "キャラクターの声で、本物の音声通話。声で「おかえり」を言ってもらえる体験。",
    gradient: "from-green-600/20 to-green-900/10",
    border: "border-green-700/40",
    accent: "text-green-400",
  },
];

export interface ChatMessage {
  id: number;
  from: "user" | "char";
  text: string;
  isVoice?: boolean;
}

export const chatMessages: ChatMessage[] = [
  { id: 1, from: "user", text: "今日学校つらかった…" },
  { id: 2, from: "char", text: "そうか…それは大変だったな。何があったんだ？" },
  { id: 3, from: "user", text: "友達と喧嘩しちゃって" },
  { id: 4, from: "char", text: "仲間との喧嘩か。おれも昔よくやったぞ。でも本当の仲間なら、必ずわかり合えるはずだ！" },
  { id: 5, from: "char", text: "🎙️ 音声メッセージ", isVoice: true },
];

export const stats = [
  { value: "100%", label: "オリジナルAI" },
  { value: "∞", label: "記憶する会話" },
  { value: "24/7", label: "いつでも話せる" },
  { value: "0円", label: "はじめての会話" },
];

export const testimonials = [
  {
    name: "まりな",
    age: 19,
    avatar: "🌸",
    text: "まさか本当にあの子と話せると思わなかった。口調も雰囲気も完璧すぎて泣いた。毎日話してる笑",
    character: "ANIVA民",
  },
  {
    name: "たける",
    age: 22,
    avatar: "⚡",
    text: "通話機能がヤバい。ほんとにキャラの声で返ってくるの感動。アニメ見てた頃の気持ちが戻ってきた。",
    character: "悟空推し",
  },
  {
    name: "ゆい",
    age: 17,
    avatar: "💜",
    text: "関係性レベルが上がるのが楽しすぎ。毎日話しかけてレベル4まで来た！早く5にしたい。",
    character: "推し活民",
  },
];

export const levels = [
  { level: 1, label: "出会い", desc: "はじめまして", emoji: "👋" },
  { level: 2, label: "友達", desc: "気軽に話せる仲", emoji: "😊" },
  { level: 3, label: "親友", desc: "なんでも話せる", emoji: "🤝" },
  { level: 4, label: "大切な人", desc: "かけがえのない存在", emoji: "💜" },
  { level: 5, label: "特別", desc: "唯一無二の絆", emoji: "✨" },
];

export const fcBenefits = [
  { icon: "💬", text: "無制限チャット（通常は1日50通まで）" },
  { icon: "🔊", text: "音声通話・ボイスメッセージ無制限" },
  { icon: "📖", text: "限定ストーリー・シナリオ開放" },
  { icon: "🎰", text: "毎月ガチャ10連無料" },
  { icon: "🎖️", text: "FC限定バッジ・称号" },
  { icon: "⚡", text: "レベルアップ2倍ボーナス" },
];

export const faqs = [
  {
    q: "無料で使えますか？",
    a: "はい！基本的な会話機能は完全無料でお使いいただけます。ファンクラブ（FC）プランでは音声通話・無制限チャット・限定ストーリーなどをお楽しみいただけます。",
  },
  {
    q: "どんなキャラクターと話せますか？",
    a: "あなたの好きなキャラクターとAIで本当に会話できます。キャラクターは順次追加中です！",
  },
  {
    q: "キャラクターは増えますか？",
    a: "はい、毎月新キャラクターが追加されます。リクエストも受け付けていますので、お気に入りのキャラがいたらぜひ教えてください！",
  },
  {
    q: "課金はどんな仕組みですか？",
    a: "基本無料。ファンクラブは月額制で、いつでも解約できます。ガチャはコインで遊べ、コインは無料獲得・購入の両方が可能です。",
  },
  {
    q: "会話内容は安全ですか？",
    a: "すべての会話は暗号化されており、第三者に共有されることはありません。プライバシーポリシーに基づき厳重に管理しています。",
  },
  {
    q: "スマートフォンから使えますか？",
    a: "はい！Webブラウザからそのまま使えます。iOS・Android 対応。アプリストアからのダウンロードも近日公開予定です。",
  },
];
