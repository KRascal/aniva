/**
 * Character Validator — キャラクターAI品質バリデーション層（Layer 3）
 * 
 * 3段パイプライン:
 * 1. ルールベースチェック（高速・コストゼロ） — Voice/Boundary DB定義を使用
 * 2. NGガード強化版 — AIメタ表現 + 技術用語 + 不自然な敬語
 * 3. LLMジャッジ（サンプリング実行） — 10回に1回 or フィードバック時
 * 
 * NG検出 → 自動修正 or 再生成 → フォールバック
 */

import { prisma } from './prisma';

// ============================================================
// Types
// ============================================================

export interface ValidationResult {
  passed: boolean;
  score: number;       // 0.0-1.0 キャラらしさスコア
  violations: Violation[];
  autoFixed: boolean;  // 自動修正されたか
  fixedText?: string;  // 自動修正後のテキスト
  llmJudgeResult?: LLMJudgeResult; // Stage 3の結果（実行時のみ）
}

export interface Violation {
  type: 'voice' | 'boundary' | 'knowledge' | 'meta' | 'tone';
  severity: 'critical' | 'warning';
  detail: string;
  suggestion?: string;
}

export interface LLMJudgeResult {
  score: number;
  voice_consistency: number;
  personality_consistency: number;
  knowledge_accuracy: number;
  issues: string[];
}

// 一人称の全パターン（auto-correct用）
const ALL_FIRST_PERSONS = [
  '俺', '私', '僕', 'わたし', 'あたし', 'おれ', 'ぼく', '俺様', 'わし',
  'オレ', 'ボク', 'ワタシ', 'アタシ', 'わらわ', 'あたい', '拙者', '我',
];

// サンプリングカウンター（LLMジャッジ用）
let validateCallCount = 0;

// ============================================================
// Validator
// ============================================================

export class CharacterValidator {

  /**
   * 3段バリデーション実行
   * Stage 3（LLMジャッジ）は10回に1回のサンプリングで実行
   */
  async validate(
    response: string,
    characterId: string,
    context: { userMessage: string; locale?: string },
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];
    // 一人称情報をStage 1で取得してautoCorrectに渡す
    let correctFirstPerson: string | null = null;

    // Stage 1: ルールベースチェック（DB定義ベース）
    const { violations: ruleViolations, firstPerson } = await this.ruleBasedCheck(response, characterId);
    violations.push(...ruleViolations);
    correctFirstPerson = firstPerson;

    // Stage 2: NGガード強化版
    const ngViolations = this.enhancedNGGuard(response);
    violations.push(...ngViolations);

    // Stage 3: LLMジャッジ（10回に1回のサンプリング）
    validateCallCount++;
    let llmJudgeResult: LLMJudgeResult | undefined;
    if (validateCallCount % 10 === 0) {
      try {
        const charRecord = await prisma.character.findUnique({
          where: { id: characterId },
          select: { name: true },
        });
        if (charRecord) {
          llmJudgeResult = await this.llmJudge(
            response,
            charRecord.name,
            context.userMessage,
          );
          // LLMジャッジのスコアが低い場合はwarningを追加
          if (llmJudgeResult.score < 0.5) {
            for (const issue of llmJudgeResult.issues) {
              violations.push({
                type: 'tone',
                severity: 'warning',
                detail: `LLMジャッジ: ${issue}`,
              });
            }
          }
        }
      } catch (e) {
        console.warn('[Validator] LLM judge failed:', e);
      }
    }

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const score = Math.max(0, 1.0 - (criticalCount * 0.3) - (warningCount * 0.05));

    // 自動修正可能な違反は修正を試みる
    let autoFixed = false;
    let fixedText = response;
    if (violations.length > 0) {
      const result = this.autoCorrect(response, violations, correctFirstPerson);
      if (result.fixed) {
        autoFixed = true;
        fixedText = result.text;
      }
    }

    return {
      passed: criticalCount === 0,
      score,
      violations,
      autoFixed,
      fixedText: autoFixed ? fixedText : undefined,
      llmJudgeResult,
    };
  }

  // ============================================================
  // Stage 1: ルールベースチェック
  // ============================================================

  private async ruleBasedCheck(
    response: string,
    characterId: string,
  ): Promise<{ violations: Violation[]; firstPerson: string | null }> {
    const violations: Violation[] = [];
    let firstPerson: string | null = null;

    // Voice チェック（一人称・禁止語尾）
    try {
      const voice = await prisma.characterVoice.findUnique({
        where: { characterId },
      });

      if (voice) {
        firstPerson = voice.firstPerson;

        // 一人称チェック: このキャラの一人称以外が使われていないか
        const wrongFirstPersons = ALL_FIRST_PERSONS.filter(p => p !== firstPerson);

        for (const wrong of wrongFirstPersons) {
          // 文脈を考慮: 文頭 or 助詞の前にある一人称のみ検出
          // 他キャラのセリフ引用内は除外（「」内の発言は別キャラの可能性）
          const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(
            `(?:^|[、。！？\\s])${escaped}(?=[はがもをにへとで、。！？\\s])`,
            'gm',
          );
          if (regex.test(response)) {
            violations.push({
              type: 'voice',
              severity: 'critical',
              detail: `一人称「${wrong}」を使用（正: 「${firstPerson}」）`,
              suggestion: `「${wrong}」→「${firstPerson}」に置換`,
            });
          }
        }

        // 禁止語尾チェック（sentenceEndingsから逆算 — bannedEndingsフィールドが将来追加されるまで）
        // キャラが敬語を使わないはずなのに敬語語尾がある場合
        const endings = voice.sentenceEndings as string[] | null;
        if (endings && endings.length > 0) {
          // 敬語系語尾（多くのアニメキャラで禁止）
          const casualEndings = endings.some(
            e => /だ[！!]?$|ぞ[！!]?$|ぜ[！!]?$|か[？?]?$|な[！!]?$|よ[！!]?$|ね[！!]?$/.test(e),
          );
          if (casualEndings) {
            // カジュアルなキャラが敬語を使っていたらwarning
            const formalEndings = [
              /です[。！!]?$/gm,
              /ます[。！!]?$/gm,
              /ございます/g,
              /でしょうか/g,
            ];
            for (const pattern of formalEndings) {
              if (pattern.test(response)) {
                violations.push({
                  type: 'voice',
                  severity: 'warning',
                  detail: '敬語語尾を使用（カジュアルキャラ）',
                  suggestion: `語尾を「${endings[0]}」等に変更`,
                });
                break; // 1つ見つければ十分
              }
            }
          }
        }
      }
    } catch (e) {
      // DB接続エラー時はスキップ（バリデーション失敗でチャットを止めない）
      console.warn('[Validator] Voice check failed:', e);
    }

    // Boundary チェック（hard severity のルールのみ）
    try {
      const boundaries = await prisma.characterBoundary.findMany({
        where: { characterId, severity: 'hard' },
      });

      for (const boundary of boundaries) {
        // example（NG例）がある場合、それが含まれていないかチェック
        if (boundary.example && response.includes(boundary.example)) {
          violations.push({
            type: 'boundary',
            severity: 'critical',
            detail: `禁止ルール違反: ${boundary.rule}`,
          });
        }
      }
    } catch (e) {
      console.warn('[Validator] Boundary check failed:', e);
    }

    return { violations, firstPerson };
  }

  // ============================================================
  // Stage 2: 強化版NGガード
  // ============================================================

  private enhancedNGGuard(response: string): Violation[] {
    const violations: Violation[] = [];

    // AIメタ表現
    const metaPatterns: { pattern: RegExp; detail: string }[] = [
      { pattern: /AIとして/g, detail: 'AIメタ表現「AIとして」' },
      { pattern: /AI(?:アシスタント|チャットボット)/g, detail: 'AIアシスタント言及' },
      { pattern: /大規模言語モデル|言語モデル/g, detail: 'LLMメタ表現' },
      { pattern: /プログラム(?:された|として)/g, detail: 'プログラム言及' },
      { pattern: /(?:私|僕|俺)は(?:AI|人工知能|プログラム|ボット)/g, detail: 'AI自己言及' },
      { pattern: /申し訳(?:ございません|ありません).*(?:お力|お手伝い)/g, detail: 'カスタマーサポート的謝罪' },
      { pattern: /何かお(?:困り|手伝い)/g, detail: 'アシスタント的質問' },
      { pattern: /お手伝い(?:します|できます|いたします)/g, detail: 'アシスタント的提案' },
      // 技術用語（キャラが使うはずがない）
      { pattern: /データベース|サーバー(?!ス)|(?<![a-zA-Z])API(?![a-zA-Z])|プロンプト/g, detail: '技術用語の不自然な使用' },
      { pattern: /トークン|パラメータ|学習データ|ファインチューニング/g, detail: 'ML用語' },
      // 法的文言
      { pattern: /利用規約|プライバシーポリシー|コンプライアンス/g, detail: '法的文言' },
    ];

    for (const { pattern, detail } of metaPatterns) {
      if (pattern.test(response)) {
        violations.push({ type: 'meta', severity: 'critical', detail });
      }
    }

    // 不自然な丁寧語（Stage 1の語尾チェックとは別の観点）
    const formalPatterns = [
      /ございます(?:か|ね|よ)/g,
      /させていただ(?:きます|く)/g,
      /存じ(?:ます|上げます)/g,
    ];
    for (const pattern of formalPatterns) {
      if (pattern.test(response)) {
        violations.push({
          type: 'tone',
          severity: 'warning',
          detail: '過度に丁寧な表現（キャラによっては不自然）',
        });
      }
    }

    return violations;
  }

  // ============================================================
  // Auto-correct（自動修正）
  // ============================================================

  /**
   * critical違反を自動修正
   * - 一人称の置換
   * - AIメタ表現の除去
   */
  autoCorrect(
    text: string,
    violations: Violation[],
    correctFirstPerson: string | null,
  ): { fixed: boolean; text: string } {
    let result = text;
    let fixed = false;

    for (const v of violations) {
      // 一人称の自動修正
      if (v.type === 'voice' && v.severity === 'critical' && correctFirstPerson) {
        const match = v.detail.match(/一人称「(.+?)」を使用/);
        if (match) {
          const wrongPerson = match[1];
          const escaped = wrongPerson.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // 助詞の前にある一人称のみ置換（他キャラのセリフは壊さない）
          const regex = new RegExp(
            `(^|[、。！？\\s])${escaped}(?=[はがもをにへとで、。！？\\s])`,
            'gm',
          );
          const before = result;
          result = result.replace(regex, `$1${correctFirstPerson}`);
          if (result !== before) fixed = true;
        }
      }

      // メタ表現の自動除去
      if (v.type === 'meta' && v.severity === 'critical') {
        const metaReplacements: [RegExp, string][] = [
          [/AIとして[^。、]*[。、]?/g, ''],
          [/AI(?:アシスタント|チャットボット)[^。、]*[。、]?/g, ''],
          [/大規模言語モデル[^。、]*[。、]?/g, ''],
          [/言語モデル[^。、]*[。、]?/g, ''],
          [/プログラム(?:された|として)[^。、]*[。、]?/g, ''],
          [/(?:私|僕|俺)は(?:AI|人工知能|プログラム|ボット)[^。、]*[。、]?/g, ''],
          [/申し訳(?:ございません|ありません)/g, 'すまない'],
          [/お手伝い(?:します|できます|いたします)/g, ''],
          [/何かお(?:困り|手伝い)[^。、]*[。、]?/g, ''],
          [/データベース|(?<![a-zA-Z])API(?![a-zA-Z])|プロンプト/g, ''],
          [/トークン|パラメータ|学習データ|ファインチューニング/g, ''],
          [/利用規約|プライバシーポリシー|コンプライアンス/g, ''],
        ];

        for (const [pattern, replacement] of metaReplacements) {
          const before = result;
          result = result.replace(pattern, replacement);
          if (result !== before) fixed = true;
        }
      }
    }

    // 連続する句読点やスペースを整理
    if (fixed) {
      result = result
        .replace(/\s{2,}/g, ' ')
        .replace(/[。、]{2,}/g, '。')
        .replace(/^\s+|\s+$/gm, '')
        .trim();

      // 空になったら修正失敗扱い
      if (result.length === 0) {
        return { fixed: false, text };
      }
    }

    return { fixed, text: result };
  }

  // ============================================================
  // Stage 3: LLMジャッジ
  // ============================================================

  /**
   * LLMによるキャラクターらしさ判定
   * xAI grok-3-mini を使用（低コスト）
   * 
   * 10回に1回のサンプリング or フィードバック時に呼ばれる
   */
  async llmJudge(
    response: string,
    characterName: string,
    userMessage: string,
  ): Promise<LLMJudgeResult> {
    const defaultResult: LLMJudgeResult = {
      score: 0.8,
      voice_consistency: 0.8,
      personality_consistency: 0.8,
      knowledge_accuracy: 0.8,
      issues: [],
    };

    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return defaultResult;

      const judgePrompt = `あなたはキャラクターAIの品質審査員です。
キャラクター「${characterName}」の返答を評価してください。

ユーザー発言: ${userMessage}
キャラクター返答: ${response}

以下のJSON形式のみで回答（余分なテキスト不要）:
{
  "score": 0.0-1.0,
  "voice_consistency": 0.0-1.0,
  "personality_consistency": 0.0-1.0,
  "knowledge_accuracy": 0.0-1.0,
  "issues": ["問題点1", "問題点2"]
}

評価基準:
- score: 総合スコア
- voice_consistency: 口調の一貫性（語尾・一人称・話し方がキャラらしいか）
- personality_consistency: 性格の一貫性（キャラの性格・行動原理に合っているか）
- knowledge_accuracy: 知識の正確性（作品設定に反していないか）
- issues: 具体的な問題点（なければ空配列）`;

      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{ role: 'user', content: judgePrompt }],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!res.ok) return defaultResult;

      const data = await res.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return defaultResult;

      const parsed = JSON.parse(jsonMatch[0]) as Partial<LLMJudgeResult>;
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0.8,
        voice_consistency: typeof parsed.voice_consistency === 'number' ? parsed.voice_consistency : 0.8,
        personality_consistency: typeof parsed.personality_consistency === 'number' ? parsed.personality_consistency : 0.8,
        knowledge_accuracy: typeof parsed.knowledge_accuracy === 'number' ? parsed.knowledge_accuracy : 0.8,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    } catch {
      return defaultResult;
    }
  }
}

// シングルトンエクスポート
export const characterValidator = new CharacterValidator();
