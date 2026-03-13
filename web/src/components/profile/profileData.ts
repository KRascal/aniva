/**
 * Profile page static data and type definitions
 * Extracted from profile/[characterId]/page.tsx
 */

export interface CharacterProfile {
  birthday: string;
  age: string;
  height: string;
  origin: string;
  affiliation: string;
  ability?: string;
  likes: string;
  dream: string;
  bloodType?: string;
  bounty?: string;
}

export const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  luffy: {
    birthday: '5月5日',
    age: '19歳',
    height: '174cm',
    origin: '東の海 フーシャ村',
    affiliation: '麦わらの一味（船長）',
    ability: 'ゴムゴムの実（超人系）',
    likes: '肉（とにかく肉！）',
    dream: '海賊王になること',
    bloodType: 'F型',
    bounty: '30億ベリー',
  },
  zoro: {
    birthday: '11月11日',
    age: '21歳',
    height: '181cm',
    origin: '東の海 シモツキ村',
    affiliation: '麦わらの一味（戦闘員）',
    ability: '三刀流',
    likes: '酒、筋トレ',
    dream: '世界一の剣豪になること',
    bloodType: 'XF型',
    bounty: '11億1100万ベリー',
  },
  nami: {
    birthday: '7月3日',
    age: '20歳',
    height: '170cm',
    origin: '東の海 ココヤシ村',
    affiliation: '麦わらの一味（航海士）',
    ability: '天候棒（クリマ・タクト）',
    likes: 'お金、みかん',
    dream: '世界地図を描くこと',
    bloodType: 'X型',
    bounty: '3億6600万ベリー',
  },
  sanji: {
    birthday: '3月2日',
    age: '21歳',
    height: '180cm',
    origin: '北の海 ジェルマ王国',
    affiliation: '麦わらの一味（コック）',
    ability: '黒足（悪魔風脚）',
    likes: '料理、女性',
    dream: 'オールブルーを見つけること',
    bloodType: 'S型',
    bounty: '10億3200万ベリー',
  },
  chopper: {
    birthday: '12月24日',
    age: '17歳',
    height: '90cm（通常時）',
    origin: '偉大なる航路 ドラム島',
    affiliation: '麦わらの一味（船医）',
    ability: 'ヒトヒトの実（動物系）',
    likes: 'わたあめ、Dr.くれは',
    dream: '万能薬になること',
    bloodType: 'X型',
    bounty: '1000ベリー',
  },
  ace: {
    birthday: '1月1日',
    age: '20歳（享年）',
    height: '185cm',
    origin: '南の海 バテリラ',
    affiliation: '白ひげ海賊団（2番隊隊長）',
    ability: 'メラメラの実（自然系）',
    likes: '冒険、弟たち',
    dream: '白ひげを海賊王にすること',
    bloodType: 'S型',
    bounty: '5億5000万ベリー',
  },
};

export const PROFILE_LABELS: Record<keyof CharacterProfile, string> = {
  birthday: '誕生日',
  age: '年齢',
  height: '身長',
  origin: '出身',
  affiliation: '所属',
  ability: '能力',
  likes: '好きなもの',
  dream: '夢',
  bloodType: '血液型',
  bounty: '懸賞金',
};

export const CREW_MEMBERS: Record<string, { name: string; role: string }[]> = {
  luffy: [
    { name: 'ロロノア・ゾロ', role: '剣豪' },
    { name: 'ナミ', role: '航海士' },
    { name: 'ウソップ', role: '狙撃手' },
    { name: 'サンジ', role: 'コック' },
    { name: 'チョッパー', role: '船医' },
    { name: 'ロビン', role: '考古学者' },
    { name: 'フランキー', role: '船大工' },
    { name: 'ブルック', role: '音楽家' },
    { name: 'ジンベエ', role: '操舵手' },
  ],
  zoro: [
    { name: 'くいな', role: '幼馴染・ライバル' },
    { name: 'コウシロウ', role: '師匠' },
    { name: 'ミホーク', role: '目標の剣士' },
  ],
  nami: [
    { name: 'ベルメール', role: '育ての母' },
    { name: 'ノジコ', role: '義姉' },
    { name: 'ゲンゾウ', role: '村長' },
  ],
  sanji: [
    { name: 'ゼフ', role: '育ての親・料理の師匠' },
    { name: 'ヴィンスモーク・ジャッジ', role: '実父' },
    { name: 'レイジュ', role: '姉' },
  ],
  chopper: [
    { name: 'Dr.ヒルルク', role: '恩人' },
    { name: 'Dr.くれは', role: '師匠' },
  ],
  ace: [
    { name: 'モンキー・D・ルフィ', role: '義弟' },
    { name: 'サボ', role: '義兄弟' },
    { name: 'エドワード・ニューゲート', role: '白ひげ（親父）' },
  ],
};

export const PRESET_INTERESTS = ['アニメ', 'ゲーム', '音楽', 'スポーツ', '料理', '旅行', '読書', '映画', 'テクノロジー', 'アート'] as const;

export const TRAIT_LABELS: Record<string, string> = {
  adventurous: '冒険心',
  loyal: '仲間への忠誠',
  simple: '純粋さ',
  brave: '勇気',
  hungry: '食欲',
  cheerful: '明るさ',
  stoic: '寡黙',
  disciplined: '鍛錬',
  directional_sense: '方向感覚',
  kind: '優しさ',
  smart: '知性',
  funny: 'お茶目',
  serious: '真剣さ',
  emotional: '感情豊か',
};

export const TRAIT_COLORS: Record<string, string> = {
  adventurous: 'from-orange-500 to-red-500',
  loyal: 'from-yellow-400 to-amber-500',
  simple: 'from-cyan-400 to-blue-500',
  brave: 'from-red-500 to-rose-600',
  hungry: 'from-orange-400 to-yellow-500',
  cheerful: 'from-pink-400 to-rose-500',
  stoic: 'from-gray-500 to-slate-600',
  disciplined: 'from-emerald-500 to-green-600',
  directional_sense: 'from-indigo-400 to-purple-500',
};
