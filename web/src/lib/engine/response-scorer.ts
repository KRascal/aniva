// ============================================================
// ResponseScorer — 応答品質フィードバックループ
// ユーザーの次の反応からキャラの返答品質を自動評価し、
// character-learnings に蓄積してパーソナライズに活用する
//
// 疎結合: scoreResponse() は副作用のみ（DB書き込み）
// 失敗しても既存動作に影響しない
// ============================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

export interface ResponseScore {
  /** エンゲージメントスコア (0-1) */
  engagement: number;
  /** ユーザーのセンチメント */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** 検出されたシグナル */
  signals: string[];
}

interface ScoredInteraction {
  characterMessageId: string;
  characterResponse: string;
  userReply: string;
  score: ResponseScore;
  timestamp: string;
}

// ── Signal detection ────────────────────────────────────────

const POSITIVE_SIGNALS: [string, string[]][] = [
  ['laughed', ['笑', 'w', 'ｗ', '草', 'ワロタ', 'ウケる', '爆笑', 'lol', 'haha']],
  ['opened_up', ['実は', '本当は', '誰にも言ってない', '初めて言うけど', '打ち明ける']],
  ['affection', ['好き', '大好き', 'ありがとう', '嬉しい', '最高', '神', '推し']],
  ['asked_more', ['もっと教えて', 'もっと聞かせて', '詳しく', '続き', 'それで？', 'で？']],
  ['long_reply', []], // 長文返信（別途判定）
  ['emoticon', ['😊', '🥺', '❤️', '😭', '🎉', '✨', '💕', '😍']],
  ['agreement', ['わかる', 'それな', 'たしかに', 'だよな', 'まじそれ', 'ほんとそれ']],
];

const NEGATIVE_SIGNALS: [string, string[]][] = [
  ['went_silent', []], // 離脱（別途判定）
  ['short_reply', []], // 極短返信（別途判定）
  ['disagreed', ['違う', 'そうじゃない', '違うんだよ', 'ちがう']],
  ['confused', ['え？', 'は？', '意味わからん', 'なんで？', '急に']],
  ['bored', ['ふーん', 'へー', 'そっか', 'まあ', 'うん']],
  ['topic_change', ['それよりさ', '話変わるけど', 'ところで', '別の話']],
];

// ── Scoring logic ───────────────────────────────────────────

/**
 * ユーザーの返信からキャラ応答の品質スコアを算出
 */
function calculateScore(
  characterResponse: string,
  userReply: string,
  timeBetweenMs?: number,
): ResponseScore {
  const signals: string[] = [];
  let engagement = 0.5; // ベースライン

  // ── ポジティブシグナル検出
  for (const [signal, keywords] of POSITIVE_SIGNALS) {
    if (signal === 'long_reply') {
      // 返信がキャラの返答より長い or 80字超 → 高エンゲージメント
      if (userReply.length > characterResponse.length * 0.8 || userReply.length > 80) {
        signals.push('long_reply');
        engagement += 0.15;
      }
    } else if (keywords.some(kw => userReply.includes(kw))) {
      signals.push(signal);
      engagement += 0.1;
    }
  }

  // ── ネガティブシグナル検出
  for (const [signal, keywords] of NEGATIVE_SIGNALS) {
    if (signal === 'short_reply') {
      // 10字以下 + 感情キーワードなし → 低エンゲージメント
      if (userReply.length <= 10 && !POSITIVE_SIGNALS.some(([, kws]) => kws.some(kw => userReply.includes(kw)))) {
        signals.push('short_reply');
        engagement -= 0.15;
      }
    } else if (signal === 'went_silent') {
      // 離脱判定は別フロー（この関数では扱わない）
      continue;
    } else if (keywords.some(kw => userReply.includes(kw))) {
      signals.push(signal);
      engagement -= 0.1;
    }
  }

  // ── 返信速度ボーナス（速い返信 = 高エンゲージメント）
  if (timeBetweenMs !== undefined) {
    if (timeBetweenMs < 30_000) { // 30秒以内
      engagement += 0.05;
    } else if (timeBetweenMs > 3600_000) { // 1時間以上
      engagement -= 0.05;
    }
  }

  // クランプ
  engagement = Math.max(0, Math.min(1, engagement));

  // センチメント判定
  const posCount = signals.filter(s => ['laughed', 'opened_up', 'affection', 'asked_more', 'long_reply', 'emoticon', 'agreement'].includes(s)).length;
  const negCount = signals.filter(s => ['short_reply', 'disagreed', 'confused', 'bored', 'topic_change'].includes(s)).length;
  const sentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

  return { engagement, sentiment, signals };
}

// ── Public API ──────────────────────────────────────────────

/**
 * 前回のキャラ応答を、ユーザーの最新返信で評価する
 * chat/send の冒頭で非同期実行
 *
 * @param conversationId - 会話ID
 * @param characterId - キャラクターID
 */
export async function scorePreviousResponse(
  conversationId: string,
  characterId: string,
): Promise<void> {
  try {
    // 直近2メッセージを取得（キャラ応答 + ユーザー返信）
    const lastMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, role: true, content: true, createdAt: true, metadata: true },
    });

    if (lastMessages.length < 2) return;

    // 最新がユーザー、その前がキャラの場合のみスコアリング
    const [latest, prev, prevPrev] = lastMessages;
    if (latest.role !== 'USER' || prev.role !== 'CHARACTER') return;

    // 既にスコアリング済みならスキップ
    const prevMeta = (prev.metadata as Record<string, unknown>) ?? {};
    if (prevMeta.responseScore !== undefined) return;

    const timeBetweenMs = latest.createdAt.getTime() - prev.createdAt.getTime();
    const score = calculateScore(prev.content, latest.content, timeBetweenMs);

    // メッセージのmetadataにスコアを保存
    await prisma.message.update({
      where: { id: prev.id },
      data: {
        metadata: {
          ...prevMeta,
          responseScore: {
            engagement: Math.round(score.engagement * 100) / 100,
            sentiment: score.sentiment,
            signals: score.signals,
          },
        },
      },
    });

    // 高エンゲージメント/低エンゲージメントの場合、学習レコードに保存
    if (score.engagement >= 0.75 || score.engagement <= 0.25) {
      try {
        const { recordLearning } = await import('./character-learnings');
        const learningType = score.engagement >= 0.75 ? 'effective' : 'ineffective';
        const detail = `[ResponseScorer] engagement=${score.engagement.toFixed(2)} signals=[${score.signals.join(',')}] response="${prev.content.slice(0, 100)}"`;
        await recordLearning(characterId, learningType, detail);
      } catch {
        // character-learnings が未対応の場合はスキップ
      }
    }

    logger.debug(
      `[ResponseScorer] msg=${prev.id} engagement=${score.engagement.toFixed(2)} signals=[${score.signals.join(',')}]`
    );
  } catch (e) {
    // 完全にサイレント — 既存動作に影響しない
    logger.warn('[ResponseScorer] scoring failed (silently ignored):', e);
  }
}

/**
 * 直近N件のスコアからユーザーの好みパターンを集計
 * buildSystemPromptに注入するコンテキストを返す
 */
export async function buildEngagementContext(
  conversationId: string,
): Promise<string> {
  try {
    // 直近20件のキャラメッセージからスコア付きのものを取得
    const scored = await prisma.message.findMany({
      where: {
        conversationId,
        role: 'CHARACTER',
        metadata: { path: ['responseScore'], not: undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true, metadata: true },
    });

    if (scored.length < 5) return ''; // データ不足

    const scores = scored.map(m => {
      const meta = m.metadata as Record<string, { engagement: number; signals: string[] }>;
      return meta.responseScore;
    }).filter(Boolean);

    // 高エンゲージメント時の共通シグナル
    const highEngagement = scores.filter(s => s.engagement >= 0.65);
    const lowEngagement = scores.filter(s => s.engagement <= 0.35);

    if (highEngagement.length === 0 && lowEngagement.length === 0) return '';

    const parts: string[] = ['## 🎯 このユーザーの反応パターン（過去の学習）'];

    if (highEngagement.length > 0) {
      const highSignals = highEngagement.flatMap(s => s.signals);
      const signalCounts: Record<string, number> = {};
      for (const s of highSignals) {
        signalCounts[s] = (signalCounts[s] || 0) + 1;
      }
      const topSignals = Object.entries(signalCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);

      const signalLabels: Record<string, string> = {
        laughed: '笑わせた時に盛り上がる',
        opened_up: 'キャラが深い話をすると自己開示してくれる',
        affection: '愛情表現に反応する',
        asked_more: '詳しく聞きたがる（好奇心旺盛）',
        long_reply: '長文で返してくる（話好き）',
        agreement: '共感すると喜ぶ',
      };

      parts.push('- ✅ 刺さる返し方:');
      for (const sig of topSignals) {
        const label = signalLabels[sig];
        if (label) parts.push(`  - ${label}`);
      }
    }

    if (lowEngagement.length >= 3) {
      parts.push('- ⚠️ 反応が薄くなるパターン:');
      parts.push('  - 表面的な相槌だけの返答');
      parts.push('  - 長すぎる説明・説教調の返答');
    }

    return parts.join('\n');
  } catch (e) {
    logger.warn('[ResponseScorer] buildEngagementContext failed:', e);
    return '';
  }
}
