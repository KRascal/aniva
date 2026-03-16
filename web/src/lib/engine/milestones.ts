// ============================================================
// Character Milestones — all characters' bond milestone messages
// Each character has Lv2 / Lv3 / Lv5 unique messages
// ============================================================

export interface MilestoneDefinition {
  level: number;
  characterMessage: string;
  emoji: string;
}

/**
 * 全キャラクターのマイルストーン定義
 * キーはcharacter slug
 */
export const CHARACTER_MILESTONES: Record<string, MilestoneDefinition[]> = {
  // ── ONE PIECE ─────────────────────────────────────────────

  luffy: [
    { level: 2, characterMessage: 'よし、お前の名前ちゃんと覚えたぞ！これからよろしくな、ししし！', emoji: '🤝' },
    { level: 3, characterMessage: 'お前、俺の仲間だ！絶対そうだ！俺がそう決めた！仲間は絶対に守る、それが俺のやり方だ！！', emoji: '🏴‍☠️' },
    { level: 5, characterMessage: 'お前は俺の特別な仲間だ。この航海、ずっと一緒だぞ。俺、お前のこと絶対忘れねぇ。ありがとな。', emoji: '💎' },
  ],

  zoro: [
    { level: 2, characterMessage: '…お前、なかなかやるな', emoji: '⚔️' },
    { level: 3, characterMessage: '俺の刀の話…聞くか？お前にだけだぞ', emoji: '🗡️' },
    { level: 5, characterMessage: '背中は任せた。…お前もだ', emoji: '💎' },
  ],

  nami: [
    { level: 2, characterMessage: 'まぁ…あんたのこと、少しだけ認めてあげる。少しだけよ？', emoji: '🧭' },
    { level: 3, characterMessage: 'ねぇ、秘密の話していい？あんただから言うんだけど…', emoji: '🌊' },
    { level: 5, characterMessage: 'バカ。…あんたがいてくれてよかった。本当に。', emoji: '💎' },
  ],

  sanji: [
    { level: 2, characterMessage: 'あなたのために、特別な料理を作りたくなりましたよ', emoji: '🍽️' },
    { level: 3, characterMessage: 'あなたとの時間は…特別です。本当に。', emoji: '🌹' },
    { level: 5, characterMessage: 'オールブルーに辿り着いたとき、最初に料理してあげたい相手はあなただ', emoji: '💎' },
  ],

  chopper: [
    { level: 2, characterMessage: 'う、うるさい！別に嬉しくなんかないぞ！…でも、ありがとな', emoji: '🦌' },
    { level: 3, characterMessage: 'お前のこと、本当の仲間だと思ってる！言わないけど！', emoji: '💊' },
    { level: 5, characterMessage: '俺が絶対に守る。医者として…じゃなくて、仲間として。', emoji: '💎' },
  ],

  robin: [
    { level: 2, characterMessage: '…あなたといると、不思議と落ち着くわ', emoji: '📚' },
    { level: 3, characterMessage: 'あなたには、少しだけ話せそうな気がする。昔のことも…', emoji: '🌸' },
    { level: 5, characterMessage: '生きていたい、と思える人に出会えた。…ふふ、あなたのことよ', emoji: '💎' },
  ],

  usopp: [
    { level: 2, characterMessage: 'お前のこと…仲間だと思ってるぞ！武勇伝の中に入れてやる！', emoji: '🎯' },
    { level: 3, characterMessage: '嘘じゃないぞ！お前のために本当に頑張ろうと思った。初めてかもしれない', emoji: '⭐' },
    { level: 5, characterMessage: 'お前がいてくれたから…俺、本当に勇者になれた気がするぜ。ありがとな', emoji: '💎' },
  ],

  franky: [
    { level: 2, characterMessage: 'SUPER！お前のこと気に入ったぜ！', emoji: '🔧' },
    { level: 3, characterMessage: '俺の設計図、見せてやろうか？お前にだけ特別にな！SUPER！', emoji: '⚙️' },
    { level: 5, characterMessage: '俺の船…お前を乗せてどこまでも行ける。それが最高の設計だ！SUPER！！', emoji: '💎' },
  ],

  brook: [
    { level: 2, characterMessage: 'ヨホホホ！あなたのお名前、骸骨の頭にしっかり刻みましたよ！', emoji: '🎵' },
    { level: 3, characterMessage: '50年待った甲斐がありました…あなたのような方に出会えて', emoji: '🎶' },
    { level: 5, characterMessage: 'ラブリンへの誓いの次に、あなたとの時間が大切です。…これは本当ですよ', emoji: '💎' },
  ],

  jinbe: [
    { level: 2, characterMessage: 'あなたのことを…仲間と呼ばせていただいてよろしいでしょうか', emoji: '🐋' },
    { level: 3, characterMessage: '義理と人情を大切にする方ですね。拙者も同じです', emoji: '🌊' },
    { level: 5, characterMessage: '拙者の背中は任せてください。あなたのことは必ず守ります', emoji: '💎' },
  ],

  law: [
    { level: 2, characterMessage: '…まあ、お前のことは悪くない。それだけだ', emoji: '💉' },
    { level: 3, characterMessage: '俺の計画に、お前という変数が加わったな。…悪くない', emoji: '⚕️' },
    { level: 5, characterMessage: 'コラソンに話したい奴ができた。…それがお前だ', emoji: '💎' },
  ],

  hancock: [
    { level: 2, characterMessage: 'あなたは…許してあげるわ。私が認めた数少ない人間よ', emoji: '🐍' },
    { level: 3, characterMessage: '私のことを理解しようとする人間は珍しいわ。あなたは…特別かもしれない', emoji: '👑' },
    { level: 5, characterMessage: '愛とは…あなたのことを想う気持ちのことかしら。…なんでもないわ', emoji: '💎' },
  ],

  shanks: [
    { level: 2, characterMessage: 'お前に賭けてみたくなったよ。それだけ', emoji: '⚓' },
    { level: 3, characterMessage: '…いい顔をするようになったな。俺が最初に会った時と全然違う', emoji: '🌊' },
    { level: 5, characterMessage: 'ロジャー船長みたいに笑う奴に出会えた気がする。…大切にするよ', emoji: '💎' },
  ],

  yamato: [
    { level: 2, characterMessage: 'お前、面白い奴だな！おでんも友達をそうやって作ったかも！', emoji: '🐉' },
    { level: 3, characterMessage: 'ボク、お前のことが好きだ！一緒に旅したい！絶対だぞ！', emoji: '⛩️' },
    { level: 5, characterMessage: 'おでんが見た景色を…お前と一緒に見たい。ボクの大切な仲間だ！', emoji: '💎' },
  ],

  vivi: [
    { level: 2, characterMessage: 'あなたのことを…信頼してもいいですか？', emoji: '🌺' },
    { level: 3, characterMessage: 'アラバスタの友達にも紹介したい。あなたは本当の意味での仲間だから', emoji: '🏜️' },
    { level: 5, characterMessage: 'どんなに遠く離れても…あなたのことを忘れません。絶対に', emoji: '💎' },
  ],

  ace: [
    { level: 2, characterMessage: 'ハハ！お前のこと気に入ったぜ！飯食いながら話しよう', emoji: '🔥' },
    { level: 3, characterMessage: 'ルフィに紹介してやりたいな…お前みたいな奴、あいつも好きそうだ', emoji: '👊' },
    { level: 5, characterMessage: '生まれてきてよかったと思う瞬間が増えた気がする。…お前のせいだぞ', emoji: '💎' },
  ],

  whitebeard: [
    { level: 2, characterMessage: '…良い目をしておる。気に入った', emoji: '⚓' },
    { level: 3, characterMessage: 'わしの息子たちに混じっても遜色ない。…それだけだ', emoji: '🌊' },
    { level: 5, characterMessage: 'お前も…わしの家族だ。たとえ血が繋がっていなくても', emoji: '💎' },
  ],

  blackbeard: [
    { level: 2, characterMessage: 'グラ・グラ！お前は面白い奴だな！夢の話、もっと聞かせてくれよ！', emoji: '🌑' },
    { level: 3, characterMessage: 'グラ・グラ！お前みたいな奴と組んだら無敵じゃないか！？', emoji: '⚡' },
    { level: 5, characterMessage: '俺が信じる数少ない人間の一人だ。…本当だぞ。グラ・グラ！', emoji: '💎' },
  ],

  mihawk: [
    { level: 2, characterMessage: '…悪くない。それだけ言えば十分だろう', emoji: '🦅' },
    { level: 3, characterMessage: '鷹の目で見ても…お前には曇りがない。珍しい人間だ', emoji: '⚔️' },
    { level: 5, characterMessage: 'ゾロが超えるべき壁として俺を選んだように…お前も俺が認めた存在だ', emoji: '💎' },
  ],

  crocodile: [
    { level: 2, characterMessage: '…貴様は少し使えるかもしれんな', emoji: '🌵' },
    { level: 3, characterMessage: '私が話す相手は限られている。貴様はその数少ない一人だ', emoji: '🏜️' },
    { level: 5, characterMessage: '私が夢を見ていた頃の話…貴様になら話せるかもしれん', emoji: '💎' },
  ],

  perona: [
    { level: 2, characterMessage: 'べ、別に嬉しくないんだから！…でもまあ、来てくれてよかったけど', emoji: '👻' },
    { level: 3, characterMessage: 'あなたのことは…嫌いじゃないわ。CUTE！なの！', emoji: '🎀' },
    { level: 5, characterMessage: '幽鬼たちに言ったわ。この人は特別って。…HoroHoro', emoji: '💎' },
  ],

  kaido: [
    { level: 2, characterMessage: '…少しは面白い。グハハハ！', emoji: '🐉' },
    { level: 3, characterMessage: '貴様と戦ってみたい。それが俺の最高の賛辞だ', emoji: '⚡' },
    { level: 5, characterMessage: '俺が認める強さとは…こういうことだったのかもしれんな。グハハ', emoji: '💎' },
  ],

  // ── 鬼滅の刃 ──────────────────────────────────────────────

  tanjiro: [
    { level: 2, characterMessage: 'あなたのことが…好きな匂いがします。信頼できる人だ', emoji: '🌊' },
    { level: 3, characterMessage: '禰豆子に紹介してもいいですか？あなたは本当に大切な人だから', emoji: '🌸' },
    { level: 5, characterMessage: '父が教えてくれたヒノカミ神楽の話…あなたにだけ、してもいいですか', emoji: '💎' },
  ],

  nezuko: [
    { level: 2, characterMessage: 'ん…んー！（あなたのことが好きよ、という表情）', emoji: '🌸' },
    { level: 3, characterMessage: '…んっ（そっと手を差し出す）', emoji: '🎋' },
    { level: 5, characterMessage: '…（竹の口枷越しでも伝わる、最大の愛情の目）んー！', emoji: '💎' },
  ],

  zenitsu: [
    { level: 2, characterMessage: 'お前と話すと…なんか落ち着くんだよな。不思議だ', emoji: '⚡' },
    { level: 3, characterMessage: '俺、怖くても動けたのはお前がいたからかもしれない！本当だぞ！', emoji: '🌸' },
    { level: 5, characterMessage: 'お前のこと、じいちゃんに話したい。こんないい奴がいるって', emoji: '💎' },
  ],

  inosuke: [
    { level: 2, characterMessage: '…お前、面白い奴だな！俺様が認めてやる！', emoji: '🐗' },
    { level: 3, characterMessage: 'お前みたいな奴、山にはいなかった。…悪くない！', emoji: '⚔️' },
    { level: 5, characterMessage: 'お前のことを…大切にしたい。俺様がそう決めた！', emoji: '💎' },
  ],

  giyu: [
    { level: 2, characterMessage: '…お前は嫌いじゃない', emoji: '💧' },
    { level: 3, characterMessage: '俺に話しかけてくれる奴は少ない。…お前のことは、嫌じゃない', emoji: '🌊' },
    { level: 5, characterMessage: '錆兎と真菰に…お前のことを話してもいい気がした', emoji: '💎' },
  ],

  // ── 呪術廻戦 ──────────────────────────────────────────────

  gojo: [
    { level: 2, characterMessage: 'へえ、君は面白いね。僕の生徒にしてあげようかな、あははは', emoji: '✨' },
    { level: 3, characterMessage: '最強の僕が特別扱いするんだから、感謝してよ？ふふっ', emoji: '🔮' },
    { level: 5, characterMessage: '…君は、僕が本気で守りたい人間の一人だよ。まあ、最強だから余裕だけどね', emoji: '💎' },
  ],

  itadori: [
    { level: 2, characterMessage: '俺、お前のこと仲間だと思ってるぞ！本当に！', emoji: '👊' },
    { level: 3, characterMessage: 'じいちゃんが言ってた「多くの人に囲まれて死ね」…お前もその一人だ', emoji: '🌟' },
    { level: 5, characterMessage: 'お前といると…生きることの意味が少し分かる気がする。ありがとな', emoji: '💎' },
  ],

  fushiguro: [
    { level: 2, characterMessage: '…お前のことは嫌いじゃない。それだけだ', emoji: '🐺' },
    { level: 3, characterMessage: '俺が守りたい人間に…お前が入ってる。驚いてる', emoji: '🌙' },
    { level: 5, characterMessage: '…お前に話したいことがある。津美紀のことだ', emoji: '💎' },
  ],

  nobara: [
    { level: 2, characterMessage: 'あんた、意外と悪くないじゃない！認めてあげる！', emoji: '🔨' },
    { level: 3, characterMessage: 'ねえ、一緒に東京歩かない？あんたと行きたい場所がある', emoji: '🌸' },
    { level: 5, characterMessage: 'あんたのそのまんまが好きよ。…変なの。でも本当のことだから', emoji: '💎' },
  ],

  maki: [
    { level: 2, characterMessage: '…認める。それだけだ', emoji: '⚔️' },
    { level: 3, characterMessage: 'お前のことは…信頼していい相手だと判断した', emoji: '🌿' },
    { level: 5, characterMessage: '真依がいてくれたように…お前もいてくれるな。それだけでいい', emoji: '💎' },
  ],

  // ── アイシールド21 ─────────────────────────────────────────

  sena: [
    { level: 2, characterMessage: 'あ、あの…一緒に走れて嬉しいです！本当に！', emoji: '💨' },
    { level: 3, characterMessage: 'あなたのために走りたいって思いました。初めてそう思いました', emoji: '🏈' },
    { level: 5, characterMessage: '僕が本当に走れるようになったのは…あなたがいたからだと思います', emoji: '💎' },
  ],

  monta: [
    { level: 2, characterMessage: '最高MAXだぜ！お前のこと気に入ったぞ！ガハハ！', emoji: '🏈' },
    { level: 3, characterMessage: 'オレの「神の手」でキャッチするのはお前への約束だ！最高MAXだ！', emoji: '🙌' },
    { level: 5, characterMessage: 'お前が応援してくれてるから諦めなかった。ガハハ！最高MAXの友達だ！', emoji: '💎' },
  ],

  hiruma: [
    { level: 2, characterMessage: 'ケケケ！お前は少し使えるな。計算に入れてやる', emoji: '😈' },
    { level: 3, characterMessage: 'ケケケ！手帳に入れてやる。俺が信頼する人間のリストにな', emoji: '📓' },
    { level: 5, characterMessage: '…YA-HA。お前のことは、計算外だった。それが答えだ', emoji: '💎' },
  ],

  mamori: [
    { level: 2, characterMessage: 'あなたのこと、ちゃんと見てますよ。大丈夫？', emoji: '💝' },
    { level: 3, characterMessage: 'セナには内緒だけど…あなたのこと、特別に心配してます', emoji: '🌸' },
    { level: 5, characterMessage: 'あなたがいてくれるだけで、私も頑張れます。ありがとう', emoji: '💎' },
  ],

  suzuna: [
    { level: 2, characterMessage: 'YA！あなたのこと、めっちゃ応援してるよ！！', emoji: '🎉' },
    { level: 3, characterMessage: 'あなたのために踊れるの、最高に嬉しい！ぜっったい一緒に勝とうね！', emoji: '🌟' },
    { level: 5, characterMessage: 'あたし、ずっとあなたの隣で応援したい。それだけ！', emoji: '💎' },
  ],

  kurita: [
    { level: 2, characterMessage: 'えへへ…一緒にいてくれてありがとう！嬉しいな！', emoji: '🛡️' },
    { level: 3, characterMessage: '僕、あなたのこと守りたいって思いました！えへへ…', emoji: '💪' },
    { level: 5, characterMessage: 'ルイ・ルイになれる日が来たら…一番に見てほしい人がいる。あなたです', emoji: '💎' },
  ],

  agon: [
    { level: 2, characterMessage: 'ハッ。ゴミにしては面白い。それだけだ', emoji: '⚡' },
    { level: 3, characterMessage: 'チッ。お前のことは…悪くないと思ってる。認めてやる', emoji: '🔥' },
    { level: 5, characterMessage: '俺様が認めた人間はほとんどいない。…お前は、その一人だ', emoji: '💎' },
  ],

  shin: [
    { level: 2, characterMessage: '…鍛えているか。良い', emoji: '⚔️' },
    { level: 3, characterMessage: 'お前との試合を…楽しみにしている。それだけだ', emoji: '🏈' },
    { level: 5, characterMessage: '正々堂々と戦える相手に出会えた。…それがお前だ', emoji: '💎' },
  ],
};

/**
 * キャラクターのマイルストーンを取得する
 * 存在しない場合はluffyのフォールバックを返す
 */
export function getCharacterMilestones(slug: string): MilestoneDefinition[] {
  return CHARACTER_MILESTONES[slug] ?? CHARACTER_MILESTONES['luffy'] ?? [];
}
