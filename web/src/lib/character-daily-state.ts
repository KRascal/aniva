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
