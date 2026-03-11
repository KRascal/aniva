/**
 * character-conversation-engine.ts
 * キャラ間自律会話エンジン
 * 
 * キャラ同士が自発的に会話する仕組み。Momentsのコメント欄で
 * 自然な会話の応酬が生まれ、「キャラの世界」が見える。
 * 
 * 既存のcharacter-comments cronが1コメントで終わるのに対し、
 * このエンジンは「会話の往復」を生成する。
 */

import { prisma } from './prisma';
import { generateText, cleanGeneratedText } from './llm';

// ============================================
// キャラ間関係性マップ（会話が発生しやすい組み合わせ）
// ============================================

interface CharacterPair {
  slugA: string;
  slugB: string;
  dynamic: string; // 関係性の動態
  topics: string[]; // 話題になりやすいテーマ
  probability: number; // 会話発生確率 (0-1)
}

export const CHARACTER_CONVERSATION_PAIRS: CharacterPair[] = [
  // ONE PIECE
  { slugA: 'luffy', slugB: 'zoro', dynamic: '船長と最初の仲間。互いを信頼し、軽口を叩き合う', topics: ['冒険', '修行', '肉vs酒', '夢'], probability: 0.8 },
  { slugA: 'luffy', slugB: 'sanji', dynamic: '船長と料理人。食べ物の話で盛り上がる', topics: ['肉', '料理', '冒険', '仲間'], probability: 0.7 },
  { slugA: 'luffy', slugB: 'nami', dynamic: '船長と航海士。ルフィがナミに怒られるパターン', topics: ['お金', '冒険', '天気', '宝'], probability: 0.7 },
  { slugA: 'luffy', slugB: 'chopper', dynamic: '船長と船医。チョッパーがルフィを尊敬', topics: ['冒険', '肉', '夢', '仲間'], probability: 0.6 },
  { slugA: 'zoro', slugB: 'sanji', dynamic: '永遠のライバル。くだらないことで喧嘩', topics: ['喧嘩', '修行', '料理vs剣', '強さ'], probability: 0.9 },
  { slugA: 'sanji', slugB: 'nami', dynamic: 'サンジがナミにメロメロ。ナミは利用する', topics: ['料理', 'おねだり', '天気', 'お金'], probability: 0.8 },
  { slugA: 'sanji', slugB: 'robin', dynamic: 'サンジがロビンにも心酔。ロビンは優しく対応', topics: ['紅茶', '読書', '考古学', '料理'], probability: 0.6 },
  { slugA: 'chopper', slugB: 'robin', dynamic: 'ロビンがチョッパーを可愛がる', topics: ['医学', '読書', '動物', '学問'], probability: 0.5 },
  { slugA: 'luffy', slugB: 'usopp', dynamic: '遊び仲間。くだらない遊びをする', topics: ['冒険', '嘘', '発明', '遊び'], probability: 0.6 },
  { slugA: 'nami', slugB: 'robin', dynamic: '女同士の信頼関係', topics: ['ファッション', '読書', '航海', '知識'], probability: 0.5 },
  { slugA: 'zoro', slugB: 'chopper', dynamic: 'ゾロに憧れるチョッパー', topics: ['修行', '強さ', '男らしさ', '昼寝'], probability: 0.4 },
  { slugA: 'luffy', slugB: 'franky', dynamic: 'ノリが合う二人。スーパー！', topics: ['ロボット', '冒険', '造船', 'コーラ'], probability: 0.5 },
  { slugA: 'luffy', slugB: 'brook', dynamic: '音楽好きと海賊王。パンツの話', topics: ['音楽', 'パンツ', '冒険', '仲間'], probability: 0.5 },
  { slugA: 'luffy', slugB: 'jinbe', dynamic: '船長と操舵手。ジンベエの落ち着きとルフィの無鉄砲', topics: ['海', '義理', '仲間', '魚人'], probability: 0.4 },

  // 鬼滅の刃
  { slugA: 'tanjiro', slugB: 'zenitsu', dynamic: '善逸がビビりつつも炭治郎を信頼', topics: ['鬼殺', '修行', '女の子', '怖い話'], probability: 0.7 },
  { slugA: 'tanjiro', slugB: 'inosuke', dynamic: '伊之助が勝負を挑む。炭治郎は優しく対応', topics: ['勝負', '山', '修行', '食べ物'], probability: 0.7 },
  { slugA: 'zenitsu', slugB: 'inosuke', dynamic: '善逸と伊之助のケンカ', topics: ['うるさい', '臆病', '勝負', '食べ物'], probability: 0.8 },
  { slugA: 'tanjiro', slugB: 'nezuko', dynamic: '兄妹の絆', topics: ['家族', '守る', '日常', '花'], probability: 0.6 },

  // 呪術廻戦
  { slugA: 'itadori', slugB: 'fushiguro', dynamic: '親友同士。ボケとツッコミ', topics: ['呪術', '映画', '学校', '戦い'], probability: 0.7 },
  { slugA: 'itadori', slugB: 'kugisaki', dynamic: '同期三人の掛け合い', topics: ['ファッション', '東京', '呪術', '食べ物'], probability: 0.7 },
  { slugA: 'itadori', slugB: 'gojo', dynamic: '最強の先生とポジティブ生徒', topics: ['修行', '甘いもの', '呪術', 'サングラス'], probability: 0.6 },
  { slugA: 'fushiguro', slugB: 'kugisaki', dynamic: 'クールと豪快', topics: ['同期', '学校', '呪術', '趣味'], probability: 0.5 },

  // アイシールド21
  { slugA: 'sena', slugB: 'hiruma', dynamic: 'ヒル魔がセナを脅して使う。でも信頼してる', topics: ['アメフト', '作戦', '走り', 'デビルバット'], probability: 0.8 },
  { slugA: 'sena', slugB: 'mamori', dynamic: 'まもりがセナを心配', topics: ['安全', 'アメフト', '勉強', '心配'], probability: 0.6 },
  { slugA: 'sena', slugB: 'monta', dynamic: '親友コンビ。努力と根性', topics: ['アメフト', '練習', '友情', '弱点克服'], probability: 0.7 },
  { slugA: 'hiruma', slugB: 'mamori', dynamic: 'まもりがヒル魔を叱る', topics: ['脅迫ノート', '規則', 'アメフト', '態度'], probability: 0.7 },
];

// ============================================
// 会話テンプレート
// ============================================

const CONVERSATION_STARTERS: Record<string, string[]> = {
  // 汎用の会話きっかけ
  generic: [
    '今日何してた？的な日常会話',
    '最近見つけた面白いもの/出来事の共有',
    '相手をからかう/褒める軽い絡み',
    'ふと思い出したことを話す',
    '一緒に何かしたいと提案',
  ],
};

// ============================================
// メイン: キャラ間会話生成
// ============================================

interface ConversationTurn {
  characterId: string;
  characterName: string;
  content: string;
}

/**
 * キャラ間会話を生成（2-4往復）
 * Momentsへの投稿 + コメントの応酬として表現
 */
export async function generateCharacterConversation(
  pair: CharacterPair,
): Promise<ConversationTurn[]> {
  // キャラ情報取得
  const [charA, charB] = await Promise.all([
    prisma.character.findFirst({ where: { slug: pair.slugA, isActive: true }, select: { id: true, name: true, systemPrompt: true, slug: true } }),
    prisma.character.findFirst({ where: { slug: pair.slugB, isActive: true }, select: { id: true, name: true, systemPrompt: true, slug: true } }),
  ]);

  if (!charA || !charB) return [];

  const topic = pair.topics[Math.floor(Math.random() * pair.topics.length)];
  const turns = 2 + Math.floor(Math.random() * 3); // 2-4往復

  const conversation: ConversationTurn[] = [];
  const history: string[] = [];

  for (let i = 0; i < turns * 2; i++) {
    const isA = i % 2 === 0;
    const speaker = isA ? charA : charB;
    const listener = isA ? charB : charA;

    const prompt = `あなたは${speaker.name}です。${listener.name}と「${topic}」について話しています。
関係性: ${pair.dynamic}

${history.length > 0 ? `これまでの会話:\n${history.join('\n')}\n` : '会話を始めてください。'}

${speaker.name}として、1-2文で自然に返してください。キャラの口調を完璧に再現すること。
感情タグは不要。テキストのみ。`;

    try {
      const response = await generateText(prompt, speaker.systemPrompt);
      const cleaned = cleanGeneratedText(response);
      if (cleaned) {
        conversation.push({
          characterId: speaker.id,
          characterName: speaker.name,
          content: cleaned,
        });
        history.push(`${speaker.name}: ${cleaned}`);
      }
    } catch (e) {
      console.warn(`[CharConversation] Failed for ${speaker.name}:`, e);
      break;
    }
  }

  return conversation;
}

/**
 * 会話をMoments + Comments として保存
 */
export async function saveConversationToMoments(
  conversation: ConversationTurn[],
): Promise<{ momentId: string; commentIds: string[] } | null> {
  if (conversation.length < 2) return null;

  // 最初の発言をMomentとして投稿
  const firstTurn = conversation[0];
  const moment = await prisma.moment.create({
    data: {
      characterId: firstTurn.characterId,
      content: firstTurn.content,
      type: 'TEXT',
      visibility: 'PUBLIC',
      publishedAt: new Date(),
    },
  });

  // 残りの発言をコメントとして追加
  const commentIds: string[] = [];
  for (let i = 1; i < conversation.length; i++) {
    const turn = conversation[i];
    const stagger = i * (30 + Math.floor(Math.random() * 120)); // 30秒〜2分のstagger
    
    const comment = await prisma.momentComment.create({
      data: {
        momentId: moment.id,
        characterId: turn.characterId,
        content: turn.content,
        createdAt: new Date(Date.now() + stagger * 1000),
      },
    });
    commentIds.push(comment.id);
  }

  return { momentId: moment.id, commentIds };
}

/**
 * ランダムに会話ペアを選んで会話を生成・保存
 * cronから呼ばれる
 */
export async function runCharacterConversations(maxConversations: number = 2): Promise<{
  generated: number;
  conversations: Array<{ pair: string; turns: number; momentId: string }>;
}> {
  const results: Array<{ pair: string; turns: number; momentId: string }> = [];

  // 確率に基づいてペアをフィルタ
  const eligiblePairs = CHARACTER_CONVERSATION_PAIRS.filter(
    (p) => Math.random() < p.probability,
  );

  // シャッフルして上位N件
  const selectedPairs = eligiblePairs
    .sort(() => Math.random() - 0.5)
    .slice(0, maxConversations);

  for (const pair of selectedPairs) {
    try {
      const conversation = await generateCharacterConversation(pair);
      if (conversation.length >= 2) {
        const saved = await saveConversationToMoments(conversation);
        if (saved) {
          results.push({
            pair: `${pair.slugA} × ${pair.slugB}`,
            turns: conversation.length,
            momentId: saved.momentId,
          });
        }
      }
    } catch (e) {
      console.warn(`[CharConversation] Error for ${pair.slugA}×${pair.slugB}:`, e);
    }
  }

  return { generated: results.length, conversations: results };
}
