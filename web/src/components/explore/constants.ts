// Franchise categories with gradient
export const FRANCHISE_CATEGORIES = [
  { name: 'すべて', gradient: 'from-purple-500 to-pink-500' },
  { name: 'ONE PIECE', gradient: 'from-orange-500 to-red-500' },
  { name: 'アイシールド21', gradient: 'from-green-500 to-lime-500' },
  { name: '呪術廻戦', gradient: 'from-blue-500 to-indigo-600' },
  { name: '鬼滅の刃', gradient: 'from-pink-500 to-rose-600' },
  { name: 'ドラゴンボール', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'NARUTO', gradient: 'from-orange-400 to-yellow-500' },
  { name: '進撃の巨人', gradient: 'from-gray-600 to-gray-800' },
  { name: 'アニメ', gradient: 'from-emerald-500 to-cyan-500' },
];

export const FRANCHISE_META: Record<string, { gradient: string }> = {
  'ONE PIECE':    { gradient: 'from-orange-500 to-red-500' },
  'アイシールド21': { gradient: 'from-green-500 to-lime-500' },
  '呪術廻戦':     { gradient: 'from-blue-500 to-indigo-600' },
  '鬼滅の刃':     { gradient: 'from-pink-500 to-rose-600' },
  'ドラゴンボール':{ gradient: 'from-yellow-400 to-orange-500' },
  'NARUTO':       { gradient: 'from-orange-400 to-yellow-500' },
  '進撃の巨人':   { gradient: 'from-gray-500 to-gray-700' },
  'アニメ':       { gradient: 'from-emerald-500 to-cyan-500' },
};

export const CARD_GRADIENTS = [
  'from-purple-600 via-pink-600 to-rose-500',
  'from-blue-600 via-cyan-500 to-teal-500',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-green-600 via-emerald-500 to-cyan-500',
  'from-indigo-600 via-violet-500 to-purple-500',
  'from-rose-600 via-red-500 to-orange-500',
];
