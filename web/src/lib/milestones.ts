export interface Milestone {
  id: string;
  level: number; // この level に達したときに発火
  title: string; // 「仲間認定」
  description: string; // 「ルフィがお前を仲間と認めた」
  characterMessage: string; // チャット画面に表示するルフィのセリフ
  emoji: string;
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
