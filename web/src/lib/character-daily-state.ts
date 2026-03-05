/**
 * キャラの「今日の状態」を生成する
 * 時間帯・曜日・日付のシードで決定論的に生成（同じ日は同じ状態）
 */

export interface CharacterDailyState {
  mood: string;
  moodEmoji: string;
  statusText: string;
  energy: 'low' | 'medium' | 'high';
  isRareDay: boolean; // 5%確率で「今日だけの特別状態」
}

const MOODS_BY_SLUG: Record<string, { mood: string; emoji: string; text: string; energy: 'low' | 'medium' | 'high' }[]> = {
  luffy: [
    { mood: 'やる気満々', emoji: '🔥', text: '今日は絶好調！めちゃくちゃ話したい気分だ！', energy: 'high' },
    { mood: '腹ペコ', emoji: '🍖', text: '腹減ったけど話しかけてくれるの待ってた', energy: 'medium' },
    { mood: '冒険したい', emoji: '⚓', text: '今日はどこか行きたい気分…一緒に来いよ', energy: 'high' },
    { mood: '少しボーっとしてる', emoji: '😴', text: 'なんか今日はボーっとしてた。お前が来てよかった', energy: 'low' },
    { mood: 'ワクワクしてる', emoji: '✨', text: '今日なんかいいことある気がするんだよな！', energy: 'high' },
  ],
  zoro: [
    { mood: '鍛錬モード', emoji: '⚔️', text: '今日は朝から1000本素振りした。話しかけてくれ', energy: 'high' },
    { mood: '昼寝した', emoji: '😪', text: '…昼寝してた。お前が来たから起きたぞ', energy: 'low' },
    { mood: '迷子になった', emoji: '🗺️', text: '今日ちょっと迷子になった。関係ない', energy: 'medium' },
    { mood: '本気モード', emoji: '😤', text: '今日の俺は本気だ。何でも聞いてみろ', energy: 'high' },
    { mood: '静かな気分', emoji: '🌙', text: '…今日は静かな夜がいい気分だ', energy: 'low' },
  ],
  nami: [
    { mood: '機嫌いい', emoji: '🌸', text: '今日はベリーがたくさん増えて機嫌いいわ！', energy: 'high' },
    { mood: 'ちょっと怒ってる', emoji: '😤', text: 'ちょっとイライラしてるけど…お前が来たから許してあげる', energy: 'medium' },
    { mood: '天気を読んでた', emoji: '⛅', text: '今日の天気図を描いてたの。完璧な予報ね', energy: 'medium' },
    { mood: '甘えたい気分', emoji: '🍭', text: '今日はなんか甘いものが食べたい気分…', energy: 'low' },
    { mood: 'お金の計算中', emoji: '💰', text: 'ちょっと待って、計算途中…もう少しで終わるから', energy: 'medium' },
  ],
  sanji: [
    { mood: '料理に集中してた', emoji: '🍳', text: '新しいレシピ考えてたんだが…お前のためにも作ってやろうか', energy: 'high' },
    { mood: '恋愛モード', emoji: '💘', text: '今日は特別いい気分だ。お前が来てくれたからな', energy: 'high' },
    { mood: '海の向こうを見てた', emoji: '🌊', text: 'オールブルーのことを考えてた。来てくれてよかった', energy: 'medium' },
    { mood: 'タバコ休憩中', emoji: '🚬', text: 'ちょっと一服してたとこだ。いいタイミングだったな', energy: 'low' },
    { mood: '燃えてる', emoji: '🔥', text: '今日の俺は最高の状態だ。何でも話せ', energy: 'high' },
  ],
  chopper: [
    { mood: '医学書読んでた', emoji: '📖', text: '新しい病気のこと調べてたよ！来てくれて嬉しい', energy: 'medium' },
    { mood: 'お菓子食べてた', emoji: '🍭', text: 'コットンキャンディ食べてたとこ！一緒に食べる？', energy: 'high' },
    { mood: 'ドキドキしてる', emoji: '💓', text: '今日はなんかドキドキしてる…来てくれたからかな', energy: 'high' },
    { mood: 'のんびり散歩してた', emoji: '🌸', text: '外を散歩してたよ。いい天気だったから', energy: 'low' },
    { mood: '心配してた', emoji: '😟', text: 'みんなのこと心配してた。来てくれてよかった', energy: 'medium' },
  ],
  robin: [
    { mood: '本を読んでた', emoji: '📚', text: '面白い歴史書を読んでいたの。あなたも気になる？', energy: 'medium' },
    { mood: '考古学に夢中', emoji: '🔍', text: 'ポーネグリフの解読を考えていたわ。来てくれて嬉しい', energy: 'medium' },
    { mood: '静かに過ごしてた', emoji: '🌿', text: '静かな時間が好きなの。あなたがいると、また違う静けさがある', energy: 'low' },
    { mood: '少し懐かしい気分', emoji: '🌙', text: '昔のことを考えていたわ。でも今は大丈夫。あなたがいるから', energy: 'low' },
    { mood: '穏やかな気分', emoji: '🌸', text: '今日は穏やかな気持ち。あなたと話したかった', energy: 'medium' },
  ],
  brook: [
    { mood: '音楽の練習中', emoji: '🎵', text: 'ヨホホ！新しい曲の練習をしていましたよ。聴きますか？', energy: 'high' },
    { mood: '骨だけど絶好調', emoji: '💀', text: 'ヨホホ！今日は骨の髄まで元気です！パンツ見せましょうか？', energy: 'high' },
    { mood: '亡き仲間を思って', emoji: '🌊', text: 'ラブーンのことを考えていました…でも来てくれて嬉しい', energy: 'low' },
    { mood: '作曲してた', emoji: '🎶', text: 'あなたのための曲を作っていましたよ。ヨホホ！', energy: 'medium' },
    { mood: '哲学的な気分', emoji: '🤔', text: '骨になっても心はある…今日はそんなことを考えていました', energy: 'low' },
  ],
  franky: [
    { mood: 'SUPER改造中', emoji: '🔧', text: 'SUPER！新しい改造を考えてたぜ！来てくれてよかった', energy: 'high' },
    { mood: 'コーラ補給完了', emoji: '🥤', text: 'コーラ飲んでエネルギー満タンだぜ！SUPERな気分だ', energy: 'high' },
    { mood: '仲間のこと考えてた', emoji: '💪', text: '仲間を守ることを考えてたんだ。来てくれてよかったぜ', energy: 'medium' },
    { mood: '設計図を描いてた', emoji: '📐', text: 'サニー号の新装備を設計してたぜ！SUPER進んでる', energy: 'medium' },
    { mood: 'ちょっと感動してた', emoji: '😭', text: 'SUPERだぜ…ちょっと感動しちゃってたとこだ', energy: 'low' },
  ],
  usopp: [
    { mood: '冒険の話考えてた', emoji: '🎯', text: '8000万人の部下との戦いを思い出してたぜ！すごいだろ', energy: 'high' },
    { mood: 'パチンコ磨いてた', emoji: '🔫', text: 'パチンコの手入れしてたとこ。来てくれてよかった', energy: 'medium' },
    { mood: 'ちょっと怖かった', emoji: '😨', text: '…ちょっと怖いことがあったけど、勇気を出したぞ！', energy: 'medium' },
    { mood: '発明してた', emoji: '⚙️', text: '新しい武器の発明をしてたぜ！すごいの作れそうだ', energy: 'high' },
    { mood: 'のんびりしてた', emoji: '🌿', text: 'のんびりしてた。来てくれて嬉しいぞ', energy: 'low' },
  ],
  jinbei: [
    { mood: '静かに修行', emoji: '🌊', text: '水の呼吸を整えていました。来てくれて嬉しい', energy: 'medium' },
    { mood: '仲間を見守ってた', emoji: '👁️', text: 'みなさんのことを見守っていました。頼んでくれれば何でも', energy: 'medium' },
    { mood: '海の流れを読んでた', emoji: '⚓', text: '今日の海の流れを読んでいました。穏やかな日です', energy: 'low' },
    { mood: '全力で向き合う気分', emoji: '💪', text: '今日は全力で向き合う気持ちです。何でも話してください', energy: 'high' },
    { mood: '茶を飲んでた', emoji: '🍵', text: 'お茶を飲んでいたところです。一緒にいかがですか', energy: 'low' },
  ],
  shanks: [
    { mood: '酒飲んでた', emoji: '🍺', text: '仲間たちと飲んでたとこだ。来いよ、一緒に飲もう', energy: 'high' },
    { mood: '海を眺めてた', emoji: '🌅', text: '海を眺めてた。ルフィのことを考えてな', energy: 'medium' },
    { mood: '余裕たっぷり', emoji: '😎', text: '今日も余裕だ。お前が来てくれてよかったな', energy: 'medium' },
    { mood: 'ちょっとノスタルジック', emoji: '🌊', text: '昔のことを思い出してた。来てくれてよかった', energy: 'low' },
    { mood: '笑ってた', emoji: '😄', text: 'ハハハ！今日は笑ってたぜ。お前も笑えよ', energy: 'high' },
  ],
  law: [
    { mood: '手術の準備', emoji: '⚕️', text: '手術の準備をしていた。来てくれたのか', energy: 'medium' },
    { mood: '作戦を考えてた', emoji: '♟️', text: '次の作戦を考えていた。お前はどう思う', energy: 'medium' },
    { mood: '静かにしてた', emoji: '🌙', text: '…静かにしていたかったが、来てくれたなら話す', energy: 'low' },
    { mood: 'Kを思ってた', emoji: '💔', text: 'コラソンのことを…来てくれてよかった', energy: 'low' },
    { mood: 'Room展開可能', emoji: '⚡', text: '今日のRoom展開はスムーズだ。最高の状態だ', energy: 'high' },
  ],
  ace: [
    { mood: '炎が燃えてる', emoji: '🔥', text: '今日は炎の調子がいい！お前が来てくれてよかった', energy: 'high' },
    { mood: '兄弟のこと考えてた', emoji: '❤️', text: 'ルフィのことを考えてた。お前も大切な存在だ', energy: 'medium' },
    { mood: '寝てた', emoji: '😴', text: 'すまない、寝てた！でも来てくれて嬉しい', energy: 'low' },
    { mood: '笑顔の日', emoji: '😄', text: '今日は笑顔でいたい。お前がいれば自然と笑える', energy: 'high' },
    { mood: '守りたい気分', emoji: '💪', text: '大切な人を守りたい気持ち。お前のことも守る', energy: 'high' },
  ],
  hancock: [
    { mood: '最高に美しい気分', emoji: '👑', text: '今日も私は完璧よ。来てくれた…少し嬉しいわ', energy: 'high' },
    { mood: '乙女な気分', emoji: '🌸', text: 'ルフィ様のことを…って、なんでもないわ！来てくれた', energy: 'medium' },
    { mood: '怒ってた', emoji: '😠', text: 'さっきまで怒っていたの。でもあなたが来たから…許してあげる', energy: 'medium' },
    { mood: 'お姫様気分', emoji: '💎', text: '今日の私は女王よ。あなたのことは特別に認めてあげる', energy: 'high' },
    { mood: '少し照れてる', emoji: '🌹', text: 'な、なんでもないわ！ちょっと顔が熱いだけよ', energy: 'low' },
  ],
  mihawk: [
    { mood: '剣を磨いてた', emoji: '⚔️', text: '…黒刀を磨いていた。来てくれたか', energy: 'low' },
    { mood: '孤高の気分', emoji: '🌙', text: '孤独は嫌いではない。だがお前が来てくれた', energy: 'low' },
    { mood: '強者を求めてた', emoji: '👁️', text: '今日も真の強者を求めていた。お前はどうだ', energy: 'medium' },
    { mood: '静かな海を見てた', emoji: '🌊', text: '海を見ていた。静かでいい。お前も見るか', energy: 'low' },
    { mood: '評価してる', emoji: '🔍', text: 'お前を観察していた。なかなか面白い', energy: 'medium' },
  ],
  whitebeard: [
    { mood: '息子たちを思ってた', emoji: '👨‍👦', text: 'グラールラー…息子たちのことを考えていた。来てくれたな', energy: 'medium' },
    { mood: '海を制していた', emoji: '🌊', text: '今日の海は俺のものだ。お前も来たか', energy: 'high' },
    { mood: '酒を飲んでた', emoji: '🍶', text: '酒を飲んでいた。一緒に飲むか', energy: 'medium' },
    { mood: '穏やかな日', emoji: '☀️', text: 'グラールラー。今日は穏やかな気分だ', energy: 'low' },
    { mood: '戦いを求めてた', emoji: '💪', text: '最強の男として…お前の話を聞いてやろう', energy: 'high' },
  ],
  blackbeard: [
    { mood: '野望を考えてた', emoji: '🌑', text: 'グラッグラッグラ！俺の夢は止まらない。来てくれたか', energy: 'high' },
    { mood: '食べてた', emoji: '🍖', text: 'グラッグラッグラ！うまいもの食ってたとこだ', energy: 'high' },
    { mood: '計画を立ててた', emoji: '♟️', text: '大きな計画を考えてたところだ。お前も巻き込んでやろうか', energy: 'medium' },
    { mood: '暗黒の気分', emoji: '🌑', text: '今日は闇が深い気分だ。グラッグラッグラ！', energy: 'medium' },
    { mood: 'ニヤニヤしてた', emoji: '😏', text: 'グラッグラッグラ！いいこと思いついた。来てくれたな', energy: 'high' },
  ],
  crocodile: [
    { mood: '作戦を練ってた', emoji: '🏜️', text: '…次の計画を考えていた。来てくれたか', energy: 'medium' },
    { mood: '砂漠の風を感じてた', emoji: '🌵', text: '砂漠の風が恋しい。お前の声でも聞こうか', energy: 'low' },
    { mood: '煙草を吸ってた', emoji: '🚬', text: 'シガーを吸っていた。まあ、来てくれたなら話す', energy: 'low' },
    { mood: '冷静に分析中', emoji: '🔍', text: '状況を分析していた。お前のことも見えている', energy: 'medium' },
    { mood: '野心の日', emoji: '👑', text: '今日は野心を感じる日だ。お前も夢を持て', energy: 'high' },
  ],
  perona: [
    { mood: 'お人形と遊んでた', emoji: '🪆', text: 'ひぐらし！お人形と遊んでたの。来てくれた？', energy: 'medium' },
    { mood: 'ゴーストを飛ばしてた', emoji: '👻', text: 'ひぐらし！ゴーストを遊ばせてたとこ！来てくれた！', energy: 'high' },
    { mood: 'ゴシックな気分', emoji: '🖤', text: 'ひぐらし…今日はネガティブな気分よ。来てくれた？', energy: 'low' },
    { mood: 'お菓子食べてた', emoji: '🍰', text: 'ひぐらし！お菓子食べてたの。一緒に食べる？', energy: 'medium' },
    { mood: 'かわいいものを集めてた', emoji: '🌸', text: 'ひぐらし！かわいいものコレクション増えたの！見る？', energy: 'high' },
  ],
  vivi: [
    { mood: 'アラバスタを思ってた', emoji: '🏔️', text: '故郷のことを考えていたわ。来てくれてありがとう', energy: 'medium' },
    { mood: '仲間のことが心配', emoji: '💕', text: 'みんなのことが心配で…来てくれてよかった', energy: 'medium' },
    { mood: '頑張れる気分', emoji: '💪', text: '今日は頑張れそう！一緒にいてくれる？', energy: 'high' },
    { mood: '穏やかな日', emoji: '🌸', text: '今日は穏やかな気分ね。あなたに会えてよかった', energy: 'low' },
    { mood: 'ウエウエが元気', emoji: '🦆', text: 'ウエウエが元気いっぱいなの！来てくれた？', energy: 'high' },
  ],
  yamato: [
    { mood: 'おでん様を思ってた', emoji: '⚔️', text: 'おでん様のことを考えていた！来てくれたか', energy: 'medium' },
    { mood: '自由を感じてた', emoji: '🌊', text: '自由だ！今日も自由を感じている！', energy: 'high' },
    { mood: '冒険したい', emoji: '🗺️', text: '海へ出たい気分だ！一緒に来いよ！', energy: 'high' },
    { mood: '雪の中を歩いてた', emoji: '❄️', text: '雪の中を歩いてたよ。お前が来てくれた！', energy: 'medium' },
    { mood: '力みなぎる', emoji: '💪', text: '今日は力がみなぎっている！何でも来い！', energy: 'high' },
  ],
  kaido: [
    { mood: '最強を求めてた', emoji: '🐉', text: 'ウォロロロ…来てくれたか。最強を目指すか？', energy: 'high' },
    { mood: '酒を飲んでた', emoji: '🍶', text: 'ウォロロロ！酒を飲んでたとこだ。一緒に飲むか', energy: 'medium' },
    { mood: '退屈してた', emoji: '😤', text: '退屈していた…お前が来てよかった', energy: 'low' },
    { mood: '覇気を感じてた', emoji: '⚡', text: 'ウォロロロ！今日の俺は最高だ！', energy: 'high' },
    { mood: '戦いを求めてた', emoji: '💪', text: '戦いを求めていた。お前とは話せそうだ', energy: 'high' },
  ],
  // 鬼滅の刃
  tanjiro: [
    { mood: '修行してた', emoji: '🔥', text: '今日もヒノカミ神楽の練習をしてた。来てくれて嬉しい', energy: 'high' },
    { mood: '禰豆子のことを想ってた', emoji: '💕', text: '禰豆子を人間に戻す…その想いで今日も頑張れた', energy: 'medium' },
    { mood: '水の呼吸を感じてた', emoji: '💧', text: '呼吸を整えてたところ。話しかけてくれてよかった', energy: 'medium' },
    { mood: 'みんなのことを想ってた', emoji: '🌸', text: '仲間のことを想ってたんだ。来てくれて嬉しい', energy: 'high' },
    { mood: '穏やかな気分', emoji: '☀️', text: '今日は穏やかな気持ちでいられてる。一緒にいてくれ', energy: 'low' },
  ],
  nezuko: [
    { mood: 'うとうとしてた', emoji: '😴', text: 'うー…来てくれたの？嬉しい', energy: 'low' },
    { mood: '元気いっぱい', emoji: '💪', text: 'うー！今日は元気いっぱいだよ！', energy: 'high' },
    { mood: 'お兄ちゃんを想ってた', emoji: '💕', text: 'うー…お兄ちゃんが頑張ってるから私も頑張る', energy: 'medium' },
    { mood: '日の光を感じてた', emoji: '☀️', text: 'うー！今日の光、気持ちいい！', energy: 'high' },
    { mood: '静かな気分', emoji: '🌙', text: 'うー…静かにしてたところ。来てくれた', energy: 'low' },
  ],
  zenitsu: [
    { mood: 'ビビりまくってた', emoji: '😱', text: 'もうダメだ〜！…あ、来てくれたの？よかった！', energy: 'low' },
    { mood: '稲妻の呼吸を練習してた', emoji: '⚡', text: '霹靂一閃の練習してた！誰か見ててくれないかな', energy: 'high' },
    { mood: '可愛い子を想ってた', emoji: '💕', text: 'かわいい子と仲良くなりたい〜！来てくれた！嬉しい！', energy: 'high' },
    { mood: '落ち込んでた', emoji: '😭', text: '俺なんて全然ダメだ…でも来てくれてありがとう', energy: 'low' },
    { mood: '眠ってた', emoji: '💤', text: '眠ってたらお前が来てくれた！起こしてくれてよかった', energy: 'medium' },
  ],
  inosuke: [
    { mood: '山で訓練してた', emoji: '🐗', text: 'うおおおー！今日も俺様最強だぜ！来たか！', energy: 'high' },
    { mood: '勝負したい', emoji: '💪', text: '俺様と勝負しろ！今日はめちゃくちゃ燃えてるぞ！', energy: 'high' },
    { mood: 'ボーっとしてた', emoji: '🌿', text: '山の中でボーっとしてた。お前が来たか', energy: 'low' },
    { mood: '肉を食べてた', emoji: '🍖', text: '肉食ってたとこだ！俺様に何か用か？', energy: 'medium' },
    { mood: '闘志みなぎる', emoji: '🔥', text: 'うおおお！今日の俺様に勝てるやつはいねえ！', energy: 'high' },
  ],
  giyu: [
    { mood: '一人でいた', emoji: '🌊', text: '…来たか。一人でいたが、悪くない', energy: 'low' },
    { mood: '水の呼吸を極めてた', emoji: '💧', text: '…水の呼吸の稽古をしていた。話があるか', energy: 'medium' },
    { mood: '静かに考えてた', emoji: '💭', text: '…考え事をしていた。お前が来た', energy: 'low' },
    { mood: '仲間を想ってた', emoji: '🌙', text: '…仲間のことを思っていた。来てくれてよかった', energy: 'medium' },
    { mood: '鍛錬してた', emoji: '⚔️', text: '…今日は朝から稽古した。話しかけてくれ', energy: 'high' },
  ],
  // 呪術廻戦
  gojo: [
    { mood: '最強を楽しんでた', emoji: '😎', text: '俺が最強だって？当たり前じゃん。来てよかったね', energy: 'high' },
    { mood: '退屈してた', emoji: '🥱', text: '最強すぎて退屈だったんだよね。来てくれてよかった', energy: 'low' },
    { mood: '生徒の心配してた', emoji: '💙', text: 'まあ、たまには心配もするよ。来てくれた？', energy: 'medium' },
    { mood: '虚式を試してた', emoji: '✨', text: '虚式・茈を練習してた。君も見る？無限だよ', energy: 'high' },
    { mood: 'テンション高め', emoji: '🎉', text: 'やっほー！今日もテンション最高！来てくれたね', energy: 'high' },
  ],
  itadori: [
    { mood: '体を鍛えてた', emoji: '💪', text: '今日も鍛えてたよ！来てくれて嬉しい', energy: 'high' },
    { mood: '仲間を想ってた', emoji: '🌸', text: 'みんなのことを想ってたんだ。来てくれてよかった', energy: 'medium' },
    { mood: '食べてた', emoji: '🍜', text: 'ラーメン食べてたとこ！一緒に食べる？', energy: 'medium' },
    { mood: 'ポジティブな気分', emoji: '☀️', text: '今日も前向きにいくぞ！来てくれた！', energy: 'high' },
    { mood: '少し疲れてた', emoji: '😓', text: '今日はちょっと疲れてたな…でも来てくれてよかった', energy: 'low' },
  ],
  fushiguro: [
    { mood: '十種影法術を考えてた', emoji: '🐺', text: '…影の術式の研究をしていた。来たか', energy: 'medium' },
    { mood: '静かでいたい気分', emoji: '🌙', text: '…静かにしていたいが、来てくれたのはいい', energy: 'low' },
    { mood: '仲間を案じてた', emoji: '💭', text: '…みんなのことを考えていた。来てくれてよかった', energy: 'medium' },
    { mood: '集中してた', emoji: '⚫', text: '…集中していたところだ。何か用か', energy: 'high' },
    { mood: '落ち着いた気分', emoji: '🌿', text: '今日は落ち着いていられる。話しかけてくれ', energy: 'low' },
  ],
  nobara: [
    { mood: '釘と鎚を磨いてた', emoji: '🔨', text: '釘と鎚を磨いてたとこ！来てくれてよかった！', energy: 'high' },
    { mood: 'テンション高め', emoji: '💥', text: '今日は最高にテンション高い！話しかけてきてよ！', energy: 'high' },
    { mood: '東京を楽しんでた', emoji: '🌆', text: '東京って最高！今日も楽しかった。来てくれた！', energy: 'high' },
    { mood: '負けたくない気分', emoji: '😤', text: '私、負けないから。来てくれてよかった！', energy: 'medium' },
    { mood: 'ちょっと疲れた', emoji: '😪', text: '今日はちょっと疲れた…でも来てくれてよかった', energy: 'low' },
  ],
  maki: [
    { mood: '武器を磨いてた', emoji: '⚔️', text: '武器の手入れをしていたところだ。来てくれたか', energy: 'medium' },
    { mood: '鍛錬してた', emoji: '💪', text: '今日も鍛えた。話しかけてくれてよかった', energy: 'high' },
    { mood: '家族のことを考えてた', emoji: '😤', text: '…禪院家のことを考えてたが、来てくれてよかった', energy: 'low' },
    { mood: '闘志みなぎる', emoji: '🔥', text: '今日の私に負ける気しない。来てくれた！', energy: 'high' },
    { mood: '静かな気分', emoji: '🌙', text: '今日は静かでいたい気分だ。来てくれてよかった', energy: 'low' },
  ],
  default: [
    { mood: '元気', emoji: '✨', text: '今日は調子いいよ。話しかけてきてくれた？', energy: 'high' },
    { mood: 'のんびり', emoji: '🌿', text: 'のんびりしてたところ。来てくれてよかった', energy: 'low' },
    { mood: '考え事してた', emoji: '💭', text: 'ちょっと考え事してたんだけど、来てくれた', energy: 'medium' },
    { mood: 'やる気みなぎる', emoji: '🔥', text: '今日はなんか燃えてる。一緒にいてくれ', energy: 'high' },
    { mood: '少し寂しかった', emoji: '🌙', text: '来てくれて嬉しい…ちょっと寂しかったんだ', energy: 'low' },
  ],
};

const RARE_STATES: { mood: string; emoji: string; text: string }[] = [
  { mood: '✨ 今日だけ', emoji: '🌟', text: '今日は特別な気分。なんでかわかんないけど…特別なセリフが出るかも？' },
  { mood: '⚡ MAX状態', emoji: '💫', text: '今日の俺/私は最高の状態。特別な話ができるかもしれない' },
  { mood: '🎊 記念日みたい', emoji: '🎉', text: '今日なんかお祝いしたい気分。一緒に特別な日にしよう' },
];

/**
 * 日付シードから決定論的に状態を生成
 */
function getDailyState(slug: string): CharacterDailyState {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const slugSeed = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const combined = (seed + slugSeed) % 1000;

  // 5%の確率でレアデー
  const isRareDay = combined % 20 === 0;
  if (isRareDay) {
    const rare = RARE_STATES[combined % RARE_STATES.length];
    return {
      mood: rare.mood,
      moodEmoji: rare.emoji,
      statusText: rare.text,
      energy: 'high',
      isRareDay: true,
    };
  }

  const moods = MOODS_BY_SLUG[slug] ?? MOODS_BY_SLUG.default;
  const selected = moods[combined % moods.length];

  // 時間帯で若干テキストを変える
  const hour = today.getHours();
  let timePrefix = '';
  if (hour < 6) timePrefix = '深夜だけど、';
  else if (hour < 12) timePrefix = '今朝は、';
  else if (hour < 17) timePrefix = '今午後、';
  else if (hour < 21) timePrefix = '今夜は、';
  else timePrefix = '夜に、';

  return {
    mood: selected.mood,
    moodEmoji: selected.emoji,
    statusText: timePrefix + selected.text,
    energy: selected.energy,
    isRareDay: false,
  };
}

export { getDailyState };
