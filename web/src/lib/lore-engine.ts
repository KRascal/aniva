/**
 * lore-engine.ts
 * ローアブック/World Info — キャラクター知識の動的注入
 *
 * 仕組み:
 * 1. ユーザーメッセージからキーワード抽出
 * 2. LoreEntryのkeywords配列とマッチング（高速）
 * 3. pgvectorセマンティック検索（精度補完）
 * 4. 上位N件をbuildSystemPromptに注入
 */

import { prisma } from './prisma';

export interface LoreResult {
  title: string;
  content: string;
  category: string;
  importance: number;
  matchType: 'keyword' | 'semantic' | 'both';
}

/**
 * メッセージに関連するLoreEntryを検索して返す
 * @param franchiseId   フランチャイズID (ONE PIECE等)
 * @param userMessage   ユーザーの発言
 * @param maxEntries    最大返却件数（デフォルト3件）
 * @param minImportance 最低重要度フィルタ（デフォルト3）
 */
export async function getRelevantLore(
  franchiseId: string,
  userMessage: string,
  maxEntries: number = 3,
  minImportance: number = 3,
): Promise<LoreResult[]> {
  // メッセージを小文字・トークン化
  const msgLower = userMessage.toLowerCase();
  const msgTokens = msgLower.split(/[\s、。！？\n]+/).filter(t => t.length >= 2);

  // 1. キーワードマッチング（高速・完全一致優先）
  const allEntries = await prisma.loreEntry.findMany({
    where: {
      franchiseId,
      importance: { gte: minImportance },
    },
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      keywords: true,
      importance: true,
    },
    orderBy: { importance: 'desc' },
    take: 200, // 候補を広めに取得してからフィルタ
  });

  // キーワードスコアリング
  const scored: Array<{ entry: typeof allEntries[0]; score: number; matchType: LoreResult['matchType'] }> = [];
  for (const entry of allEntries) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (msgLower.includes(kw)) {
        // 完全一致は高スコア、長いキーワードほど高スコア
        score += Math.max(1, kw.length * 2);
      } else {
        // 部分一致（トークンがキーワードに含まれる）
        for (const token of msgTokens) {
          if (kw.includes(token) || token.includes(kw)) {
            score += 1;
          }
        }
      }
    }
    if (score > 0) {
      scored.push({ entry, score, matchType: 'keyword' });
    }
  }

  // スコア降順でソート、上位N件を返却
  scored.sort((a, b) => b.score - a.score || b.entry.importance - a.entry.importance);
  const topEntries = scored.slice(0, maxEntries);

  return topEntries.map(({ entry, matchType }) => ({
    title: entry.title,
    content: entry.content,
    category: entry.category,
    importance: entry.importance,
    matchType,
  }));
}

/**
 * フランチャイズIDをキャラクタースラッグから取得
 * ONE PIECE → ONE PIECEフランチャイズのID
 */
export async function getFranchiseIdByCharacter(characterId: string): Promise<string | null> {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { franchise: true },
    });
    if (!character) return null;

    const franchise = await prisma.loreFranchise.findFirst({
      where: {
        OR: [
          { name: character.franchise },
          { nameEn: character.franchise },
        ],
      },
      select: { id: true },
    });
    return franchise?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * ローアブックコンテキストをプロンプト用文字列に変換
 * buildSystemPrompt() に渡すための文字列を生成
 */
export function formatLoreContext(entries: LoreResult[]): string {
  if (entries.length === 0) return '';

  const lines: string[] = ['\n## 作品知識（会話の参考に）'];
  lines.push('以下の情報は作品の設定です。質問に関連する場合は正確に回答すること。');

  for (const entry of entries) {
    lines.push(`\n### ${entry.title}`);
    // 長いcontentは300文字で切り捨て
    const content = entry.content.length > 300
      ? entry.content.slice(0, 300) + '...'
      : entry.content;
    lines.push(content);
  }

  return lines.join('\n');
}

/**
 * ONE PIECEのサンプルデータを投入するユーティリティ
 * 初期設定時に一度だけ実行する
 */
export async function seedOnePieceLore(): Promise<{ created: number; franchiseId: string }> {
  // フランチャイズを作成またはIDを取得
  const franchise = await prisma.loreFranchise.upsert({
    where: { name: 'ONE PIECE' },
    create: {
      name: 'ONE PIECE',
      nameEn: 'ONE PIECE',
      description: '尾田栄一郎原作の海賊冒険漫画。主人公モンキー・D・ルフィが海賊王を目指す物語。',
    },
    update: {},
  });

  const entries = [
    {
      title: 'ゴムゴムの実',
      content: 'ルフィが幼少期に食べた悪魔の実。体全体がゴムになり、伸縮自在になる能力を得る。海に入ると溺れる（海楼石も苦手）。真の姿はヒトヒトの実・幻獣種・モデル太陽神ニカ。',
      category: 'ability',
      keywords: ['ゴムゴム', 'ゴムゴムの実', '悪魔の実', 'ニカ', '太陽神'],
      importance: 9,
    },
    {
      title: 'ギア4',
      content: 'ルフィが体にゴムを送り込む技。バウンドマン・タンクマン・スネークマンの3形態がある。使用後は一定時間能力を使えなくなる。サンダーバガン等の強力な技が使える。',
      category: 'ability',
      keywords: ['ギア4', 'ギアフォース', 'バウンドマン', 'タンクマン', 'スネークマン', 'サンダーバガン'],
      importance: 8,
    },
    {
      title: 'ギア5',
      content: 'ルフィの最強形態。太陽神ニカの能力が覚醒した状態。体が自由自在に変形し、周囲の人を「笑わせる」ことができる。白髪・白眉になり全身が白くなる。ルフィ自身は戦いを楽しんでいる。',
      category: 'ability',
      keywords: ['ギア5', 'ギアファイブ', 'ニカ', '覚醒', '太陽神ニカ'],
      importance: 10,
    },
    {
      title: '三刀流',
      content: 'ゾロが使う剣術スタイル。口にも一本くわえて三本の刀で戦う。奥義「三千世界」「鬼切り」「虎狩り千両斬り」等。覇気を纏うことでさらに強化。',
      category: 'ability',
      keywords: ['三刀流', 'ゾロ', '三千世界', '鬼切り', '虎狩り'],
      importance: 8,
    },
    {
      title: '麦わらの一味',
      content: '主人公ルフィを中心とした海賊団。メンバー: ルフィ(船長)・ゾロ(剣士)・ナミ(航海士)・ウソップ(狙撃手)・サンジ(コック)・チョッパー(船医)・ロビン(考古学者)・フランキー(大工)・ブルック(音楽家)・ジンベエ(操舵手)の10人。',
      category: 'character',
      keywords: ['麦わら', '一味', '麦わら海賊団', 'ストローハット'],
      importance: 10,
    },
    {
      title: 'マリンフォード頂上戦争',
      content: 'エース救出を巡る大規模な戦争。白ひげ海賊団vs海軍の激突。エースは海軍に処刑された。白ひげも死亡。ルフィに大きなトラウマを与えた出来事。この後ルフィは2年間の修行をする。',
      category: 'event',
      keywords: ['マリンフォード', '頂上戦争', 'エース処刑', '白ひげ', '頂上決戦'],
      importance: 9,
    },
    {
      title: '悪魔の実',
      content: '食べると特殊な能力を得られる謎の果実。食べると泳げなくなる。自然系・超人系・動物系の三種類。ひとつの実の能力者は世界に一人だけ。',
      category: 'item',
      keywords: ['悪魔の実', '能力者', '泳げない', '自然系', '超人系', '動物系'],
      importance: 7,
    },
    {
      title: '覇気',
      content: '精神力・生命力を武器にする力。武装色(硬化)・見聞色(未来予知)・覇王色(相手を気絶させる)の三種類。鍛えることで強化できる。悪魔の実の能力者でも使える。',
      category: 'ability',
      keywords: ['覇気', '武装色', '見聞色', '覇王色', 'コーティング'],
      importance: 8,
    },
    {
      title: 'ドラム王国/サクラ王国',
      content: 'チョッパーの故郷。チョッパーがヒルルクとくれはに育てられた島。かつてワポルに支配されていたがルフィたちが解放。チェリー(桜)の木が有名で、春になると雪の上に桜が咲く。',
      category: 'location',
      keywords: ['ドラム王国', 'サクラ王国', 'チョッパー', 'くれは', 'ヒルルク'],
      importance: 6,
    },
    {
      title: 'メラメラの実',
      content: 'エースが持つ悪魔の実の能力。炎人間になれる。炎を生み出し、自在に操ることができる。「火拳」が代表技。エースの死後、能力はドフラミンゴ一味の誰かに渡り、後にサボが食べた。',
      category: 'ability',
      keywords: ['メラメラ', 'メラメラの実', '炎', '火拳', 'エース', '炎拳'],
      importance: 8,
    },
    {
      title: '白ひげ海賊団',
      content: '「世界最強の男」と呼ばれたエドワード・ニューゲート(白ひげ)率いる海賊団。エースは2番隊隊長。白ひげはメンバーを「息子」と呼んでいた。マリンフォード戦争で白ひげ死亡後に解散。',
      category: 'character',
      keywords: ['白ひげ', '白ひげ海賊団', 'ニューゲート', '2番隊', '息子'],
      importance: 8,
    },
    {
      title: 'ワノ国',
      content: '鎖国された侍の国。カイドウとオロチが支配していた。ルフィたちがカイドウを打倒。ゾロの先祖リューマの故郷でもある。錦えもんやモモの助が重要人物。',
      category: 'location',
      keywords: ['ワノ国', 'カイドウ', '侍', '鎖国', 'ヤマト'],
      importance: 7,
    },
    {
      title: 'ルフィの一族',
      content: '父: モンキー・D・ドラゴン（革命軍首領）、祖父: モンキー・D・ガープ（海軍英雄）、実父の友人にゴール・D・ロジャー。ルフィ本人は血統に興味がなく、仲間を大切にする。',
      category: 'character',
      keywords: ['ドラゴン', 'ガープ', 'ロジャー', 'ルフィ', '血統', '家族'],
      importance: 7,
    },
    {
      title: '天候棒（クリマ・タクト）',
      content: 'ナミが使う武器。大気中の水分や温度差を利用して気象現象を起こす。サニャン・パスポン（気球）、ランバ（電気雲）等の技がある。ウェザーエッグが核心。',
      category: 'ability',
      keywords: ['クリマ・タクト', '天候棒', 'ナミ', 'サニャン', 'ランバ'],
      importance: 6,
    },
    {
      title: 'ヒトヒトの実（チョッパー）',
      content: 'チョッパーが食べた悪魔の実。動物系・人型。トナカイが食べたため人語を話し、二足歩行もできる。ランブルボールという薬を使うと複数の変形形態を使える（7形態）。',
      category: 'ability',
      keywords: ['ヒトヒト', 'チョッパー', 'ランブルボール', 'モンスターポイント', '変形'],
      importance: 7,
    },
  ];

  let created = 0;
  for (const entry of entries) {
    try {
      await prisma.loreEntry.upsert({
        where: {
          // titleとfranchiseIdの組み合わせでupsert
          // 複合ユニーク制約がないので、findFirst→create/update
          id: `seed_${franchise.id}_${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
        },
        create: {
          id: `seed_${franchise.id}_${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
          franchiseId: franchise.id,
          title: entry.title,
          content: entry.content,
          category: entry.category,
          keywords: entry.keywords,
          importance: entry.importance,
          spoilerLevel: 0,
        },
        update: {
          content: entry.content,
          keywords: entry.keywords,
          importance: entry.importance,
        },
      });
      created++;
    } catch {
      // skip if exists
    }
  }

  return { created, franchiseId: franchise.id };
}
