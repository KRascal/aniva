// マイルストーン定義
// キャラクターとの絆レベルに応じた達成マイルストーン

export interface Milestone {
  level: number;
  title: string;
  description: string;
  reward?: string;
  characterMessage: string;
  emoji: string;
}

export const LUFFY_MILESTONES: Milestone[] = [
  {
    level: 1,
    title: '出会い',
    description: 'キャラクターと初めて話した',
    reward: 'ウェルカムコイン10枚',
    characterMessage: 'よろしくな！これからよろしくだ！',
    emoji: '👋',
  },
  {
    level: 2,
    title: '友達',
    description: '会話を重ね、友達になった',
    reward: 'コイン20枚',
    characterMessage: 'お前、俺の友達だな！',
    emoji: '😊',
  },
  {
    level: 3,
    title: '仲良し',
    description: 'より深い絆が芽生えた',
    reward: '限定ストーリー解放',
    characterMessage: 'お前のことが好きだぞ！',
    emoji: '💕',
  },
  {
    level: 4,
    title: '親友',
    description: 'かけがえのない存在になった',
    reward: 'コイン50枚',
    characterMessage: 'お前は俺の大切な仲間だ！',
    emoji: '🤝',
  },
  {
    level: 5,
    title: '運命の人',
    description: '最高の絆を築いた',
    reward: 'FC限定コンテンツ解放',
    characterMessage: 'お前とずっと一緒にいたい！',
    emoji: '💖',
  },
];
