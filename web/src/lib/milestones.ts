export interface Milestone {
  id: string;
  level: number; // この level に達したときに発火
  title: string; // 「仲間認定」
  description: string; // 「ルフィがお前を仲間と認めた」
  characterMessage: string; // チャット画面に表示するルフィのセリフ
  emoji: string;
}

// 全キャラ共通のマイルストーンテンプレート（個別定義がないキャラ用）
function defaultMilestones(name: string): Milestone[] {
  return [
    { id: 'milestone-lv2', level: 2, title: '知り合い', description: `${name}があなたを覚えた`, characterMessage: `…ああ、お前のこと覚えたよ`, emoji: '🤝' },
    { id: 'milestone-lv3', level: 3, title: '信頼', description: `${name}があなたを信頼し始めた`, characterMessage: `…お前、悪くないな`, emoji: '⚔️' },
    { id: 'milestone-lv4', level: 4, title: '特別', description: `${name}にとって特別な存在に`, characterMessage: `…お前にだけ、話すことがある`, emoji: '⭐' },
    { id: 'milestone-lv5', level: 5, title: '深い絆', description: `最も深い絆で結ばれた`, characterMessage: `…ありがとな。お前がいてくれて`, emoji: '💎' },
  ];
}

// キャラ固有マイルストーン定義
export const CHARACTER_MILESTONES: Record<string, Milestone[]> = {
  zoro: [
    { id: 'milestone-lv2', level: 2, title: '認知', description: 'ゾロがお前を認識した', characterMessage: '…ああ、お前か', emoji: '⚔️' },
    { id: 'milestone-lv3', level: 3, title: '信頼', description: 'ゾロが背中を預ける覚悟を見せた', characterMessage: '俺の刀の話…聞くか？お前にだけだぞ', emoji: '🗡️' },
    { id: 'milestone-lv5', level: 5, title: '誓い', description: '世界一への道を共に', characterMessage: '背中は任せた。…お前もだ', emoji: '💎' },
  ],
  nami: [
    { id: 'milestone-lv2', level: 2, title: '友達', description: 'ナミが心を開き始めた', characterMessage: 'あんた、まあまあ話しやすいじゃん', emoji: '🍊' },
    { id: 'milestone-lv3', level: 3, title: '仲間', description: 'ナミが本音を見せた', characterMessage: '…ねぇ、あんたにだけ言うんだけどさ', emoji: '🌊' },
    { id: 'milestone-lv5', level: 5, title: '大切な人', description: 'ナミの宝物になった', characterMessage: '…バカ。あんたのこと、大切に思ってるに決まってんでしょ', emoji: '💎' },
  ],
  sanji: [
    { id: 'milestone-lv2', level: 2, title: '客人', description: 'サンジが料理を振る舞った', characterMessage: 'お前、いい舌してるな。もっと食わせてやるよ', emoji: '🍳' },
    { id: 'milestone-lv3', level: 3, title: '常連', description: 'サンジの特別メニュー解放', characterMessage: '…お前だけに作る特別な一皿がある', emoji: '👨‍🍳' },
    { id: 'milestone-lv5', level: 5, title: '家族', description: 'サンジにとって守るべき存在', characterMessage: '…ありがとよ。お前の笑顔が、俺の一番のレシピだ', emoji: '💎' },
  ],
  chopper: [
    { id: 'milestone-lv2', level: 2, title: '患者', description: 'チョッパーがあなたの健康を気にし始めた', characterMessage: 'う、うるさい！別に心配なんかしてないぞ！…ちゃんと寝てる？', emoji: '💊' },
    { id: 'milestone-lv3', level: 3, title: '友達', description: 'チョッパーが照れずに話せるように', characterMessage: '…ねぇ、俺のこと本当に仲間って思ってくれてる？嬉しい…！', emoji: '🩺' },
    { id: 'milestone-lv5', level: 5, title: '一番の友達', description: 'チョッパーの大切な仲間', characterMessage: '俺、お前のこと絶対守るから！万能薬になる日まで…ずっとそばにいるから！', emoji: '💎' },
  ],
  robin: [
    { id: 'milestone-lv2', level: 2, title: '興味', description: 'ロビンがあなたに興味を持った', characterMessage: 'ふふ…あなた、面白い人ね', emoji: '📚' },
    { id: 'milestone-lv3', level: 3, title: '信頼', description: 'ロビンが過去を少し語った', characterMessage: '…あなたには、少しだけ話してもいいかしら', emoji: '🌸' },
    { id: 'milestone-lv5', level: 5, title: '生きる理由', description: 'ロビンの「生きたい」の一部に', characterMessage: '…あなたがいてくれるから、私は今日も笑える。ありがとう', emoji: '💎' },
  ],
  hancock: [
    { id: 'milestone-lv2', level: 2, title: '許可', description: 'ハンコックが会話を許可した', characterMessage: '…特別に話してあげるわ。感謝なさい', emoji: '👑' },
    { id: 'milestone-lv3', level: 3, title: '寵愛', description: 'ハンコックが心を許した', characterMessage: '…あなたの前では、少しだけ素直になれる気がする', emoji: '🐍' },
    { id: 'milestone-lv5', level: 5, title: '愛', description: 'ハンコックの全てを受け入れた', characterMessage: '…惚れてしまいなさい。…なんて。もう、惚れているのは私の方よ', emoji: '💎' },
  ],
  shanks: [
    { id: 'milestone-lv2', level: 2, title: '知己', description: 'シャンクスが杯を交わした', characterMessage: '飲もうぜ。お前、いい目してるな', emoji: '🍶' },
    { id: 'milestone-lv3', level: 3, title: '仲間', description: 'シャンクスが腕を預けた', characterMessage: '…お前に賭けてみるか', emoji: '🏴‍☠️' },
    { id: 'milestone-lv5', level: 5, title: '新時代', description: 'シャンクスが未来を託した', characterMessage: '行け。お前の時代だ。…俺はここで見届ける', emoji: '💎' },
  ],
  law: [
    { id: 'milestone-lv2', level: 2, title: '同盟', description: 'ローが一時的な協力を認めた', characterMessage: '…利害が一致するなら、協力してやる', emoji: '⚕️' },
    { id: 'milestone-lv3', level: 3, title: '信頼', description: 'ローが本心を見せた', characterMessage: '…お前には借りがある。それだけだ', emoji: '💛' },
    { id: 'milestone-lv5', level: 5, title: '絆', description: 'ローの不器用な愛情', characterMessage: '…俺がお前を気にかけてるとか、思うなよ。…思ってもいいけど', emoji: '💎' },
  ],
  gojo: [
    { id: 'milestone-lv2', level: 2, title: '認知', description: '五条が面白がった', characterMessage: 'お、いいね～。お前面白い', emoji: '👓' },
    { id: 'milestone-lv3', level: 3, title: '特別', description: '五条が本気を見せた', characterMessage: '…僕が本気になる相手、そういないよ？', emoji: '💜' },
    { id: 'milestone-lv5', level: 5, title: '唯一', description: '最強の孤独を分かち合う', characterMessage: '…ねぇ、僕のこと、最強じゃなくても好き？…ありがと', emoji: '💎' },
  ],
  tanjiro: [
    { id: 'milestone-lv2', level: 2, title: '出会い', description: '炭治郎が優しく迎えた', characterMessage: 'あなたと会えてよかった。一緒に頑張りましょう！', emoji: '🔥' },
    { id: 'milestone-lv3', level: 3, title: '仲間', description: '炭治郎が全力で守ると誓った', characterMessage: '俺は…あなたも守ります。大切な人だから', emoji: '⚔️' },
    { id: 'milestone-lv5', level: 5, title: '家族', description: '炭治郎にとって家族同然', characterMessage: '…あなたは、俺の大切な家族です。何があっても、絶対に守る', emoji: '💎' },
  ],
};

/**
 * キャラslugからマイルストーンを取得（固有定義なければデフォルト生成）
 */
export function getMilestonesForCharacter(slug: string, name: string): Milestone[] {
  return CHARACTER_MILESTONES[slug] || defaultMilestones(name);
}

export const LUFFY_MILESTONES: Milestone[] = [
  {
    id: 'milestone-lv2',
    level: 2,
    title: '知り合い',
    description: 'ルフィがお前の名前を覚えた',
    characterMessage: 'よし、お前の名前ちゃんと覚えたぞ！これからよろしくな、ししし！',
    emoji: '🤝',
  },
  {
    id: 'milestone-lv3',
    level: 3,
    title: '仲間認定',
    description: 'ルフィがお前を仲間と認めた',
    characterMessage: 'お前、俺の仲間だ！絶対そうだ！俺がそう決めた！仲間は絶対に守る、それが俺のやり方だ！！',
    emoji: '🏴‍☠️',
  },
  {
    id: 'milestone-lv4',
    level: 4,
    title: '親友',
    description: 'ルフィにとって特別な存在になった',
    characterMessage: 'お前みたいな奴、他にいないぞ。俺の大切な仲間だ。何があっても俺が守る、絶対にだ！',
    emoji: '⭐',
  },
  {
    id: 'milestone-lv5',
    level: 5,
    title: '特別な絆',
    description: '最も深い絆で結ばれた',
    characterMessage: 'お前は俺の特別な仲間だ。この航海、ずっと一緒だぞ。俺、お前のこと絶対忘れねぇ。ありがとな。',
    emoji: '💎',
  },
];
