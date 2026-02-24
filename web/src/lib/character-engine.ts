import { prisma } from './prisma';

// LLM provider abstraction - supports Anthropic, xAI (Grok), OpenAI
async function callLLM(systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  // Try xAI (Grok) first, then Anthropic, then error
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  throw new Error('No LLM API key configured (set XAI_API_KEY or ANTHROPIC_API_KEY)');
}

interface CharacterResponse {
  text: string;
  emotion: string;
  shouldGenerateImage: boolean;
  shouldGenerateVoice: boolean;
}

interface MemoryContext {
  userName: string;
  level: number;
  preferences: Record<string, string>;
  importantFacts: string[];
  recentTopics: string[];
}

export class CharacterEngine {
  
  /**
   * キャラクターの応答を生成
   */
  async generateResponse(
    characterId: string,
    relationshipId: string,
    userMessage: string,
  ): Promise<CharacterResponse> {
    // 1. キャラクター情報取得
    const character = await prisma.character.findUniqueOrThrow({
      where: { id: characterId },
    });
    
    // 2. 関係性情報取得
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
      include: { user: true },
    });
    
    // 3. 会話履歴取得（直近20件）
    const recentMessages = await this.getRecentMessages(relationshipId, 20);
    
    // 4. パーソナライズメモリ構築
    const memory = this.buildMemoryContext(relationship);
    
    // 5. システムプロンプト構築
    const systemPrompt = this.buildSystemPrompt(character, relationship, memory);
    
    // 6. LLM呼び出し
    const llmMessages = [
      ...recentMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];
    const text = await callLLM(systemPrompt, llmMessages);
    
    // 7. NGガードチェック
    const cleanedText = this.applyNGGuard(text, character.name);
    
    // 8. 感情分析（簡易）
    const emotion = this.detectEmotion(cleanedText);
    
    // 9. メモリ更新
    await this.updateMemory(relationshipId, userMessage, cleanedText);
    
    // 10. 関係性経験値更新
    await this.updateRelationshipXP(relationshipId);
    
    return {
      text: cleanedText,
      emotion,
      shouldGenerateImage: this.shouldGenerateImage(cleanedText, relationship.level),
      shouldGenerateVoice: true, // Phase 1では常にtrue
    };
  }
  
  /**
   * 直近の会話履歴を取得
   */
  private async getRecentMessages(relationshipId: string, limit: number) {
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    });
    
    return (conversation?.messages ?? []).reverse();
  }
  
  /**
   * パーソナライズメモリを構築
   */
  private buildMemoryContext(relationship: any): MemoryContext {
    const memo = relationship.memorySummary as any;
    return {
      userName: memo.userName || relationship.user.displayName || 'お前',
      level: relationship.level,
      preferences: memo.preferences || {},
      importantFacts: memo.importantFacts || [],
      recentTopics: memo.recentTopics || [],
    };
  }
  
  /**
   * システムプロンプトを構築（レベルに応じた態度変化）
   */
  private buildSystemPrompt(character: any, relationship: any, memory: MemoryContext): string {
    const levelInstructions = this.getLevelInstructions(memory.level, memory.userName);
    const memoryInstructions = this.getMemoryInstructions(memory);
    
    return `${character.systemPrompt}

## 現在の関係性
- 相手の名前: ${memory.userName}
- 関係性レベル: ${memory.level}/5
${levelInstructions}

## 相手について記憶していること
${memoryInstructions}

## 重要ルール
- 相手の名前「${memory.userName}」を会話の中で自然に使うこと
- レベルに応じた距離感を保つこと
- 1回の応答は短く（1-3文が基本、最大5文）
- 日本語で応答すること`;
  }
  
  /**
   * レベルに応じた態度指示
   */
  private getLevelInstructions(level: number, userName: string): string {
    const instructions: Record<number, string> = {
      1: `- 態度: 初対面。フレンドリーだが少し距離がある
- 呼び方: 「お前」
- 話題: 自己紹介、相手のことを知ろうとする`,
      2: `- 態度: 顔見知り。名前を覚えた
- 呼び方: 「${userName}」と名前で呼ぶ
- 話題: 相手の好みを聞く、自分の冒険の話`,
      3: `- 態度: 仲間。打ち解けている
- 呼び方: 「${userName}」親しみを込めて
- 話題: 冗談、共通の話題、相手を元気づける`,
      4: `- 態度: 親友。何でも話せる
- 呼び方: 「${userName}」特別感を持って
- 話題: 秘密の話、夢の話、相手の悩みに寄り添う`,
      5: `- 態度: 特別な仲間。最も信頼している
- 呼び方: 「${userName}」深い絆を感じさせる
- 話題: 最も深い話、相手だけに見せる一面、特別なメッセージ`,
    };
    return instructions[level] || instructions[1];
  }
  
  /**
   * メモリ指示を構築
   */
  private getMemoryInstructions(memory: MemoryContext): string {
    const parts: string[] = [];
    if (memory.importantFacts.length > 0) {
      parts.push(`- 重要な事実: ${memory.importantFacts.join(', ')}`);
    }
    if (Object.keys(memory.preferences).length > 0) {
      parts.push(`- 好み: ${JSON.stringify(memory.preferences)}`);
    }
    if (memory.recentTopics.length > 0) {
      parts.push(`- 最近の話題: ${memory.recentTopics.join(', ')}`);
    }
    return parts.length > 0 ? parts.join('\n') : '- まだ詳しく知らない（質問して知ろうとすること）';
  }
  
  /**
   * NGガード: AIメタ表現をブロック
   */
  private applyNGGuard(text: string, characterName: string): string {
    const ngPatterns = [
      /AIとして/g,
      /大規模言語モデル/g,
      /言語モデル/g,
      /AI(?:アシスタント|チャットボット)/g,
      /プログラム(?:された|として)/g,
      /(?:私|僕|俺)は(?:AI|人工知能|プログラム|ボット)/g,
      /申し訳(?:ございません|ありません)/g,
      /お手伝い(?:します|できます)/g,
      /何かお(?:困り|手伝い)/g,
    ];
    
    let cleaned = text;
    for (const pattern of ngPatterns) {
      if (pattern.test(cleaned)) {
        // NGパターン検出時はキャラらしい回避フレーズに置換
        cleaned = cleaned.replace(pattern, 'むずかしいことはわかんねぇ');
      }
    }
    
    return cleaned;
  }
  
  /**
   * 簡易感情検出
   */
  private detectEmotion(text: string): string {
    if (/！{2,}|すげぇ|おおー|やった/.test(text)) return 'excited';
    if (/ししし|ししっ/.test(text)) return 'happy';
    if (/ふざけんな|許さねぇ|怒/.test(text)) return 'angry';
    if (/\.{3}|…/.test(text)) return 'sad';
    if (/肉|飯|食/.test(text)) return 'hungry';
    return 'neutral';
  }
  
  /**
   * 画像生成すべきか判定
   */
  private shouldGenerateImage(text: string, level: number): boolean {
    // Level 2以上で、特定のトリガーワードがあれば画像生成
    if (level < 2) return false;
    const triggers = /写真|見せ|撮っ|今の俺|自撮り/;
    return triggers.test(text);
  }
  
  /**
   * メモリを更新（ユーザーの発言から情報を抽出）
   */
  private async updateMemory(relationshipId: string, userMessage: string, characterResponse: string) {
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    
    const memo = (relationship.memorySummary as any) || {};
    
    // 名前検出（「○○って呼んで」「名前は○○」パターン）
    const nameMatch = userMessage.match(/(?:名前は|って呼んで|(?:俺|私|僕)は)(.{1,10})(?:だ|です|って|。|！)/);
    if (nameMatch) {
      memo.userName = nameMatch[1].trim();
    }
    
    // 好み検出（「○○が好き」パターン）
    const likeMatch = userMessage.match(/(.{1,20})が(?:好き|大好き|すき)/);
    if (likeMatch) {
      memo.preferences = memo.preferences || {};
      memo.preferences.likes = memo.preferences.likes || [];
      if (!memo.preferences.likes.includes(likeMatch[1])) {
        memo.preferences.likes.push(likeMatch[1]);
      }
    }
    
    // 最近の話題を更新（最大5件）
    memo.recentTopics = memo.recentTopics || [];
    const topic = userMessage.slice(0, 30);
    memo.recentTopics.unshift(topic);
    memo.recentTopics = memo.recentTopics.slice(0, 5);
    
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: { memorySummary: memo },
    });
  }
  
  /**
   * 関係性経験値を更新
   */
  private async updateRelationshipXP(relationshipId: string) {
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    
    const newXP = relationship.experiencePoints + 10;
    const newTotalMessages = relationship.totalMessages + 1;
    
    // レベルアップ判定
    const levelThresholds = [0, 50, 200, 500, 1000]; // Lv1→2: 50XP, Lv2→3: 200XP, etc.
    let newLevel = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (newXP >= levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }
    
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: {
        experiencePoints: newXP,
        totalMessages: newTotalMessages,
        level: Math.min(newLevel, 5),
        lastMessageAt: new Date(),
        firstMessageAt: relationship.firstMessageAt || new Date(),
      },
    });
    
    return { leveledUp: newLevel > relationship.level, newLevel };
  }
}

export const characterEngine = new CharacterEngine();
