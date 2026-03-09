/**
 * POST /api/scenarios/choose
 * インタラクティブシナリオ 選択肢処理
 * 
 * 選択肢分岐システム:
 * - シナリオcontentはJSON形式: { scenes: SceneNode[] }
 * - 各SceneNodeにchoices[]があり、選択でnextSceneIdへ分岐
 * - 選択結果はcharacter-engineで生成（AIアドリブ付き）
 * 
 * フォーマット (LimitedScenario.content):
 * {
 *   "type": "interactive",
 *   "scenes": [
 *     {
 *       "id": "scene_1",
 *       "text": "ルフィがこちらを見た...",
 *       "emotion": "excited",
 *       "choices": [
 *         { "id": "c1", "text": "「一緒に冒険する！」", "nextSceneId": "scene_2a" },
 *         { "id": "c2", "text": "「まだ迷ってる」", "nextSceneId": "scene_2b" }
 *       ]
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface SceneChoice {
  id: string;
  text: string;
  nextSceneId: string | null;
}

interface SceneNode {
  id: string;
  text: string;
  emotion?: string;
  characterText?: string; // キャラが言うセリフ
  choices?: SceneChoice[];
  isEnding?: boolean;
  endingType?: 'good' | 'normal' | 'bad';
}

interface InteractiveContent {
  type: 'interactive';
  scenes: SceneNode[];
  firstSceneId: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { scenarioId, choiceId, currentSceneId } = await req.json() as {
    scenarioId: string;
    choiceId: string;
    currentSceneId: string;
  };

  if (!scenarioId || !choiceId || !currentSceneId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // シナリオ取得
  const scenario = await prisma.limitedScenario.findUnique({
    where: { id: scenarioId },
    include: { character: { select: { id: true, name: true, systemPrompt: true } } },
  });

  if (!scenario || !scenario.isActive || new Date() > scenario.endsAt) {
    return NextResponse.json({ error: 'Scenario not found or expired' }, { status: 404 });
  }

  // contentがinteractiveフォーマットかチェック
  let interactiveContent: InteractiveContent | null = null;
  try {
    const parsed = JSON.parse(scenario.content) as Partial<InteractiveContent>;
    if (parsed.type === 'interactive' && Array.isArray(parsed.scenes)) {
      interactiveContent = parsed as InteractiveContent;
    }
  } catch {
    return NextResponse.json({ error: 'Not an interactive scenario' }, { status: 400 });
  }

  if (!interactiveContent) {
    return NextResponse.json({ error: 'Not an interactive scenario' }, { status: 400 });
  }

  // 現在のシーンを取得
  const currentScene = interactiveContent.scenes.find(s => s.id === currentSceneId);
  if (!currentScene) {
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  }

  // 選択肢を取得
  const choice = currentScene.choices?.find(c => c.id === choiceId);
  if (!choice) {
    return NextResponse.json({ error: 'Choice not found' }, { status: 404 });
  }

  // 次のシーンを取得
  const nextScene = choice.nextSceneId
    ? interactiveContent.scenes.find(s => s.id === choice.nextSceneId)
    : null;

  // AI でキャラクターのリアクション生成（アドリブ付き）
  let characterReaction = nextScene?.characterText ?? '';
  
  if (!characterReaction && nextScene) {
    const xaiKey = process.env.XAI_API_KEY;
    if (xaiKey) {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'grok-3-mini',
            messages: [
              {
                role: 'system',
                content: `${scenario.character.systemPrompt}\n\n[シナリオモード] インタラクティブストーリーで、ユーザーが「${choice.text}」を選んだ。1〜2文で自然な反応を返せ。口調は維持。`,
              },
              {
                role: 'user',
                content: `次のシーン: ${nextScene.text}\nキャラクターのセリフを1〜2文で返してください。`,
              },
            ],
            max_tokens: 150,
            temperature: 0.85,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { choices: Array<{ message: { content: string } }> };
          characterReaction = data.choices[0].message.content.trim();
        }
      } catch { /* fallback */ }
    }
  }

  return NextResponse.json({
    choiceMade: choice.text,
    nextScene: nextScene ? {
      id: nextScene.id,
      text: nextScene.text,
      characterReaction: characterReaction || nextScene.characterText || '',
      emotion: nextScene.emotion ?? 'neutral',
      choices: nextScene.choices ?? [],
      isEnding: nextScene.isEnding ?? false,
      endingType: nextScene.endingType,
    } : null,
    isComplete: !nextScene || (nextScene.isEnding ?? false),
  });
}
