// キャラクターのプレゼンス（在/不在）を時間帯・曜日で決定するシステム

interface PresenceState {
  isAvailable: boolean;
  status: string;
  statusEmoji: string;
  responseDelay: number;
  statusMessage?: string;
}

const CHARACTER_SCHEDULES: Record<string, { hour: number; duration: number; status: string; emoji: string; message: string }[]> = {
  luffy: [
    { hour: 12, duration: 2, status: '肉食い中', emoji: '🍖', message: 'ん？今メシ食ってる！後で話そうぜ！' },
    { hour: 15, duration: 1, status: '昼寝中', emoji: '💤', message: 'zzz...' },
    { hour: 3, duration: 5, status: '寝てる', emoji: '😴', message: '' },
  ],
  zoro: [
    { hour: 6, duration: 4, status: '修行中', emoji: '⚔️', message: '...今は修行中だ。後にしろ' },
    { hour: 14, duration: 3, status: '昼寝中', emoji: '💤', message: 'zzz...' },
    { hour: 22, duration: 2, status: '酒飲み中', emoji: '🍶', message: '一升瓶の相手で忙しい' },
    { hour: 2, duration: 5, status: '寝てる', emoji: '😴', message: '' },
  ],
  nami: [
    { hour: 10, duration: 2, status: '航海図作成中', emoji: '🗺️', message: '今、航海図描いてるの。後にして' },
    { hour: 19, duration: 2, status: 'ショッピング中', emoji: '🛍️', message: '買い物に出てるわ〜' },
    { hour: 1, duration: 6, status: '寝てる', emoji: '😴', message: '' },
  ],
  chopper: [
    { hour: 9, duration: 3, status: '薬の調合中', emoji: '💊', message: 'ご、ごめん！今薬の調合中なんだ！' },
    { hour: 14, duration: 1, status: 'おやつタイム', emoji: '🍩', message: 'わたあめ食べてるぞ！' },
    { hour: 0, duration: 7, status: '寝てる', emoji: '😴', message: '' },
  ],
  ace: [
    { hour: 11, duration: 1, status: '食事中（寝落ち）', emoji: '😴🍖', message: 'すまん…メシ食ってたら寝てた' },
    { hour: 16, duration: 2, status: '仲間と宴会中', emoji: '🎉', message: '今宴会中だぜ！お前も来いよ！' },
    { hour: 2, duration: 5, status: '寝てる', emoji: '😴', message: '' },
  ],
  law: [
    { hour: 8, duration: 3, status: 'オペ中', emoji: '🏥', message: 'オペ中だ。後にしろ' },
    { hour: 22, duration: 2, status: '研究中', emoji: '📚', message: '論文を読んでいる。急用か？' },
    { hour: 1, duration: 5, status: '寝てる', emoji: '😴', message: '' },
  ],
};

export function getCharacterPresence(slug: string): PresenceState {
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  const dayOfWeek = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay();

  const schedule = CHARACTER_SCHEDULES[slug];
  if (!schedule) {
    return { isAvailable: true, status: 'オンライン', statusEmoji: '🟢', responseDelay: 0 };
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  for (const slot of schedule) {
    const start = slot.hour;
    const end = (slot.hour + slot.duration) % 24;

    let isInSlot = false;
    if (end > start) {
      isInSlot = jstHour >= start && jstHour < end;
    } else {
      isInSlot = jstHour >= start || jstHour < end;
    }

    if (isInSlot) {
      if (slot.status === '寝てる' || Math.random() > 0.3 || (isWeekend && Math.random() > 0.5)) {
        return {
          isAvailable: slot.status !== '寝てる',
          status: slot.status,
          statusEmoji: slot.emoji,
          responseDelay: slot.status === '寝てる' ? 0 : 3000 + Math.random() * 7000,
          statusMessage: slot.message || undefined,
        };
      }
    }
  }

  if (Math.random() < 0.05) {
    return {
      isAvailable: true,
      status: 'ちょっと忙しい',
      statusEmoji: '⏳',
      responseDelay: 5000 + Math.random() * 10000,
    };
  }

  return { isAvailable: true, status: 'オンライン', statusEmoji: '🟢', responseDelay: 0 };
}

interface MoodState {
  mood: string;
  moodLabel: string;
  moodEmoji: string;
  promptModifier: string;
}

export function getCharacterMood(slug: string): MoodState {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfMonth = jst.getUTCDate();
  const hour = jst.getUTCHours();

  const seed = (dayOfMonth * 31 + slug.charCodeAt(0) * 7 + slug.length * 13) % 100;

  let mood: MoodState;

  if (seed < 25) {
    mood = {
      mood: 'high',
      moodLabel: '絶好調',
      moodEmoji: '🔥',
      promptModifier: '【今日のテンション: 高い】いつもよりテンション高め。笑顔が多い。ノリが良い。冗談も多い。「！」を多く使う。',
    };
  } else if (seed < 75) {
    mood = {
      mood: 'normal',
      moodLabel: '通常',
      moodEmoji: '😊',
      promptModifier: '',
    };
  } else if (seed < 95) {
    mood = {
      mood: 'low',
      moodLabel: 'ちょっと低め',
      moodEmoji: '😐',
      promptModifier: '【今日のテンション: 低め】少しテンションが低い。口数が少なめ。「...」を時々入れる。でも相手の話はちゃんと聞く。何かあった？と聞かれたら「なんでもねぇ」と流す。',
    };
  } else {
    mood = {
      mood: 'melancholy',
      moodLabel: 'しんみり',
      moodEmoji: '🌙',
      promptModifier: '【今日のテンション: しんみり】珍しく物思いに耽っている。深い話をしやすい状態。普段言わないような本音がポロっと出る。「...なぁ、お前はさ...」のような切り出し。',
    };
  }

  if (hour >= 0 && hour < 5) {
    mood.promptModifier += '\n【深夜の空気】深夜の静けさ。普段より少しだけ本音が出やすい。';
  }

  return mood;
}
