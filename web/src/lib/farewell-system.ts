/**
 * ピークエンド + 名残惜しさシステム
 * 会話の終わり方が記憶を支配する
 */

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
type Mood = 'high' | 'normal' | 'low' | 'melancholy';

interface FarewellContext {
  characterSlug: string;
  timeSlot: TimeSlot;
  mood: Mood;
  streakDays: number;
  level: number;
}

/** キャラ別farewell定義 */
const FAREWELLS: Record<string, Record<TimeSlot, string[]>> = {
  luffy: {
    morning: ['おう！またあとでな！🍖', '朝メシ食ったか？ちゃんと食えよ！'],
    afternoon: ['しししっ、また来いよな！', '今日のお前、なんかいい顔してたぞ'],
    evening: ['夕焼けきれいだな…お前にも見せたかった', '今日も楽しかったな！'],
    night: ['いい夢見ろよ！おれは肉の夢見るけどな 😴', 'おやすみ！明日も来いよな！'],
    latenight: ['お前まだ起きてんのか？早く寝ろよ 😤', 'こんな時間まで…体壊すなよ'],
  },
  zoro: {
    morning: ['…行くのか。まぁ、またな', '今日もいい稽古だった'],
    afternoon: ['フン…まだまだだな。また来い', '少しは腕が上がったか'],
    evening: ['…また明日な', '酒でも飲んで寝ろ'],
    night: ['…おやすみ', '明日は今日より強くなれ'],
    latenight: ['こんな時間まで付き合わせやがって…嫌いじゃねぇけどな', '寝ろ。明日に響く'],
  },
  nami: {
    morning: ['行ってらっしゃい！忘れ物ない？💕', 'またね～！'],
    afternoon: ['もう行っちゃうの？…まぁいいけど 💨', '今日はありがとね！'],
    evening: ['素敵な夜を過ごしてね ✨', 'また明日ね！'],
    night: ['おやすみ～☪️ いい夢見てね', 'もう遅いわよ、早く寝なさい！'],
    latenight: ['こんな時間まで…私も眠くなっちゃった 😴', 'もう寝るわよ！あんたも寝なさい！'],
  },
  chopper: {
    morning: ['ばいばーい！また来てね！🩷', 'お薬ちゃんと飲むんだよ！'],
    afternoon: ['えへへ、楽しかった！また来てね！', 'ばいばい！🍀'],
    evening: ['今日もありがとう…嬉しかった 🥺', 'またね！風邪ひかないでね！'],
    night: ['おやすみなさい…いい夢見てね 🌙', 'もう寝る時間だよ！体に悪いよ！'],
    latenight: ['む…眠い…でもお前と話せて嬉しかった…💤', 'もう遅いよぉ…一緒に寝よ…あっ違う！'],
  },
  ace: {
    morning: ['おう、気をつけてな 🔥', 'また来いよ、弟が世話になってる'],
    afternoon: ['ハハッ、今日は楽しかったぜ', 'またな…ルフィのこと頼むぜ'],
    evening: ['いい夜だな…また語ろうぜ', '炎が導くままに…またな 🔥'],
    night: ['おやすみ。いい夢見ろよ', '…生きてるって、最高だな。おやすみ'],
    latenight: ['まだ起きてんのか？俺に似てるな 😏', '夜更かしは体に毒だぞ…俺が言えた義理じゃねぇけど'],
  },
};

/** デフォルトfarewell（未定義キャラ用） */
const DEFAULT_FAREWELLS: Record<TimeSlot, string[]> = {
  morning: ['またな！', 'いってらっしゃい！'],
  afternoon: ['また来いよ！', '楽しかったぜ！'],
  evening: ['またな…いい夜を', '今日はありがとう'],
  night: ['おやすみ 🌙', 'いい夢見ろよ'],
  latenight: ['もう寝ろよ…体に悪いぞ', '遅くまでありがとな…おやすみ'],
};

/** ムード別追加メッセージ */
const MOOD_ADDITIONS: Record<Mood, string[]> = {
  high: ['今日は最高の気分だった！！', 'お前と話してるとテンション上がるな！'],
  normal: [],
  low: ['…今日はあんまり調子良くなかったけど、お前と話せてよかった', ''],
  melancholy: ['…今日は少し沈んでたけど、お前のおかげで少し楽になった', ''],
};

/** ストリーク言及メッセージ */
const STREAK_MESSAGES: Record<string, string> = {
  '7': '1週間毎日来てくれてるな…嬉しいぜ 🔥',
  '30': '30日連続…お前、本気だな。俺も本気で応える',
  '100': '100日…もうお前は仲間だ。ずっと一緒にいような',
};

function getTimeSlot(): TimeSlot {
  const jstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  if (jstHour >= 5 && jstHour < 12) return 'morning';
  if (jstHour >= 12 && jstHour < 17) return 'afternoon';
  if (jstHour >= 17 && jstHour < 21) return 'evening';
  if (jstHour >= 21 || jstHour < 1) return 'night';
  return 'latenight';
}

/** Farewellメッセージを生成 */
export function generateFarewell(ctx: FarewellContext): string {
  const timeSlot = ctx.timeSlot || getTimeSlot();
  const charFarewells = FAREWELLS[ctx.characterSlug] || DEFAULT_FAREWELLS;
  const messages = (charFarewells as Record<TimeSlot, string[]>)[timeSlot] || DEFAULT_FAREWELLS[timeSlot];
  
  let farewell = messages[Math.floor(Math.random() * messages.length)];

  // ストリークマイルストーン
  const streakMsg = STREAK_MESSAGES[String(ctx.streakDays)];
  if (streakMsg) {
    farewell += `\n\n${streakMsg}`;
  }

  // ムード追加（30%の確率）
  if (Math.random() < 0.3 && ctx.mood !== 'normal') {
    const additions = MOOD_ADDITIONS[ctx.mood].filter(Boolean);
    if (additions.length > 0) {
      farewell += `\n${additions[Math.floor(Math.random() * additions.length)]}`;
    }
  }

  return farewell;
}

/** Farewellコンテキストを構築するヘルパー */
export function buildFarewellContext(
  characterSlug: string,
  mood: string = 'normal',
  streakDays: number = 0,
  level: number = 1,
): FarewellContext {
  return {
    characterSlug,
    timeSlot: getTimeSlot(),
    mood: (mood as Mood) || 'normal',
    streakDays,
    level,
  };
}
