/**
 * Character Validator — キャラクターAI品質バリデーション層（Layer 3）
 * 
 * 3段パイプライン:
 * 1. ルールベースチェック（高速・コストゼロ） — Voice/Boundary DB定義を使用
 * 2. NGガード強化版 — AIメタ表現 + 技術用語 + 不自然な敬語
 * 3. LLMジャッジ（サンプリング実行） — 10回に1回 or フィードバック時
 * 
 * NG検出 → 自動再生成（最大2回） → フォールバック
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
}

export interface Violation {
  type: 'voice' | 'boundary' | 'knowledge' | 'meta' | 'tone';
  severity: 'critical' | 'warning';
  detail: string;
  suggestion?: string;
}

// ============================================================
// Validator
// ============================================================

export class CharacterValidator {

  /**
   * 3段バリデーション実行
   */
  async validate(
    response: string,
    characterId: string,
    _context: { userMessage: string; locale?: string },
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];

    // Stage 1: ルールベースチェック（DB定義ベース）
    const ruleViolations = await this.ruleBasedCheck(response, characterId);
    violations.push(...ruleViolations);

    // Stage 2: NGガード強化版
    const ngViolations = this.enhancedNGGuard(response);
    violations.push(...ngViolations);

    // Stage 3: LLMジャッジ — コスト節約のためサンプリング（呼び出し側で制御）
    // ここでは実行しない。外部から llmJudge() を直接呼ぶ

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const score = Math.max(0, 1.0 - (criticalCount * 0.3) - (warningCount * 0.05));

    // 自動修正可能な違反は修正を試みる
    let autoFixed = false;
    let fixedText = response;
    if (violations.length > 0) {
      const result = this.autoFix(response, violations);
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
    };
  }

  // ============================================================
  // Stage 1: ルールベースチェック
  // ============================================================

  private async ruleBasedCheck(response: string, characterId: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Voice チェック（一人称の不一致検出）
    try {
      const voices = await prisma.$queryRaw<{
        firstPerson: string;
        secondPerson: string;
        sentenceEndings: unknown;
      }[]>`
        SELECT "firstPerson", "secondPerson", "sentenceEndings"
        FROM "CharacterVoice"
        WHERE "characterId" = ${characterId}
        LIMIT 1
      `;

      if (voices.length > 0) {
        const voice = voices[0];
        const firstPerson = voice.firstPerson;

        // 一人称チェック: このキャラの一人称以外が使われていないか
        const allFirstPersons = ['俺', '私', '僕', 'わたし', 'あたし', 'おれ', 'ぼく', '俺様', 'わし', 'オレ', 'ボク', 'ワタシ'];
        const wrongFirstPersons = allFirstPersons.filter(p => p !== firstPerson);

        for (const wrong of wrongFirstPersons) {
          // 文脈を考慮: 文頭 or 助詞の前にある一人称のみ検出
          const regex = new RegExp(`(?:^|[、。！？「」\\s])${wrong}(?:[はがもをにへとで、。！？\\s])`, 'gm');
          if (regex.test(response)) {
            violations.push({
              type: 'voice',
              severity: 'critical',
              detail: `一人称「${wrong}」を使用（正: 「${firstPerson}」）`,
              suggestion: `「${wrong}」→「${firstPerson}」に置換`,
            });
          }
        }
      }
    } catch (e) {
      // DB接続エラー時はスキップ（バリデーション失敗でチャットを止めない）
      console.warn('[Validator] Voice check failed:', e);
    }

    // Boundary チェック（hard severity のルールのみ）
    try {
      const boundaries = await prisma.$queryRaw<{
        rule: string;
        example: string | null;
        category: string;
      }[]>`
        SELECT rule, example, category
        FROM "CharacterBoundary"
        WHERE "characterId" = ${characterId} AND severity = 'hard'
      `;

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

    return violations;
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
      { pattern: /データベース|サーバー|API|プロンプト/g, detail: '技術用語の不自然な使用' },
      { pattern: /トークン|パラメータ|学習データ|ファインチューニング/g, detail: 'ML用語' },
      // 法的文言
      { pattern: /利用規約|プライバシーポリシー|コンプライアンス/g, detail: '法的文言' },
    ];

    for (const { pattern, detail } of metaPatterns) {
      if (pattern.test(response)) {
        violations.push({ type: 'meta', severity: 'critical', detail });
      }
    }

    // 不自然な丁寧語（キャラによっては正常だが、多くのアニメキャラには不自然）
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
  // Auto-fix
  // ============================================================

  private autoFix(text: string, violations: Violation[]): { fixed: boolean; text: string } {
    let result = text;
    let fixed = false;

    for (const v of violations) {
      // メタ表現は空文字に置換
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
          [/データベース|サーバー|API|プロンプト/g, ''],
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
        .replace(/^\s+|\s+$/g, '')
        .trim();
    }

    return { fixed, text: result };
  }

  // ============================================================
  // Stage 3: LLMジャッジ（外部から呼び出し）
  // ============================================================

  /**
   * LLMによるキャラクターらしさ判定
   * コストが高いため、サンプリング or フィードバック時のみ呼ぶ
   */
  async llmJudge(
    response: string,
    characterName: string,
    userMessage: string,
  ): Promise<{ score: number; issues: string[] }> {
    try {
      const judgePrompt = `あなたはキャラクターAIの品質審査員です。
キャラクター「${characterName}」の返答を10点満点で評価してください。

ユーザー発言: ${userMessage}
キャラクター返答: ${response}

JSON形式で回答: {"score": 0.0-1.0, "issues": ["問題点1"]}`;

      // xAI grok-3-mini で低コスト判定
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { score: 0.8, issues: [] };

      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{ role: 'user', content: judgePrompt }],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      if (!res.ok) return { score: 0.8, issues: [] };
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 0.8, issues: [] };
    } catch {
      return { score: 0.8, issues: [] };
    }
  }
}

// シングルトンエクスポート
export const characterValidator = new CharacterValidator();
