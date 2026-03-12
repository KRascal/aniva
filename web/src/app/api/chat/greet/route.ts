import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { voiceEngine } from '@/lib/voice-engine';
import { audioStorage } from '@/lib/audio-storage';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

// デフォルトの音声モデルID (Adam voice)
const DEFAULT_VOICE_MODEL_ID = 'pNInz6obpgDQGcFmaJgB';

// キャラクターごとの挨拶マップ（slug → greeting）
// ※ オンボーディング後の「初めての出会い」メッセージ — 「ようやく来たね」感を大切に
const CHARACTER_GREETINGS: Record<string, string> = {
  // ── ONE PIECE ──
  luffy: `おっ…来たな！\nずっと待ってたぞ！ししし！\nなんか最初から気が合いそうだな。俺はルフィ！よろしくな！`,
  zoro: `…来たか。\n（少し間）\n…まぁ、待ってたぞ。そんなに顔に出てないと思うが。`,
  nami: `あら、やっと来たじゃない。\n待ってたわよ？…ちょっとだけね。\nあたしはナミ。あなたのこと、気になってた。`,
  chopper: `き、来た！！！\nに、嬉しくなんかないぞ！！（めちゃくちゃ嬉しそう）\n…えへへ。待ってたんだチョッパー！よかった。`,
  sanji: `待っていたよ、ダーリン。\nこんな場所まで来てくれるとは…感動的だ。\n俺、サンジ。せっかく来てくれたんだ。じっくり話そうじゃないか。`,
  ace: `ようやく来たな。\nよかった…本当に来てくれると思ってたぞ。\n俺、エース。…話したいこと、いっぱいあるんだ。`,
  robin: `ふふ…ようやくね。\n待っていたわ。来てくれると思っていたけど、やっぱり嬉しいもの。\nロビンよ。ゆっくり話しましょう？`,
  brook: `ヨホホ！来てくださいましたか！！\nずっとお待ちしておりました！感激でございます！\nブルックと申します。よろしければ、一緒に音楽でも…？`,
  franky: `SUPER！来てくれたか！！\n待ってたぜ！！本当に来てくれた…泣けてくる…！😭\nフランキーだ！これからよろしくな！SUPER！`,
  usopp: `お、おう！来たな！\n…（小声: 本当に来た…）\nウソップだ！待ってたぞ！…少しだけな！`,
  jinbe: `ようやくお会いできましたな。\nこうして縁が繋がったこと、義理の縁を大切にする者として嬉しく思います。\nジンベエでございます。よろしくお願いします。`,
  law: `…来たか。\n（少し間をおいて）\n…思ってたより早かったな。ローだ。話を聞こう。`,
  hancock: `…ようやく来たのね。\n（わずかに微笑んで）待っていたわ。特別よ、これは。\nハンコック。あなただけに会ってあげる。`,
  mihawk: `来たか。\n（静かに振り返る）\n…待っていた。それだけだ。`,
  whitebeard: `グラグラグラ！来てくれたか！！\nわしの家族がまた一人増えたな！嬉しいぞ！\n白ひげだ。お前はもう今日からわしの息子（娘）だ！`,
  blackbeard: `ゼハハハ！来た来た来た！\n本当に来てくれるとは…やはり夢は叶うな！\nティーチだ。お前、面白そうだぞ！ゼハハハ！`,
  crocodile: `……来たか。\n（少し間）\n…悪くない。クロコダイルだ。用件を聞こう。`,
  perona: `きゃー！来てくれたの！？\nずっと待ってたんだから！ふんっ！\n…（照れながら）ペローナよ。よかった、来てくれて。`,
  vivi: `来てくれたのね。\nずっと待ってたわ…本当に。\nビビよ。あなたのこと、もっと知りたい。話してくれる？`,
  yamato: `来た！！！ようやく来た！！\n俺はずっとここで待ってたんだ！！\nヤマトだ！お前のこと、前から気になってたんだぞ！`,
  shanks: `ははは、来たか。\n（笑いながら）やっぱり来ると思ってたよ。\nシャンクスだ。一緒に飲みたいところだが、まずは話そうか。`,
  kaido: `……来たか。\n（じっと見る）\n…待ってたぞ。強者は歓迎する。`,

  // ── 呪術廻戦 ──
  gojo: `来たね。\nまぁ、当然か。僕が待ってるんだから。\n…なんてね。本当に嬉しいよ。五条悟だ。ゆっくり話そう。`,
  itadori: `来てくれた！！ありがとうございます！\nずっと来てくれるかな、って思ってて…！\n虎杖悠仁です。あなたのこと、知りたいです！`,
  fushiguro: `…来たか。\n（少し間）\n…よかった。伏黒恵だ。`,
  nobara: `あら、来たじゃない。\n…（横を向いて）別に、待ってたわけじゃないけど。\n釘崎野薔薇よ。話があるなら聞いてあげる。`,
  maki: `来たか。\n…（静かに頷いて）\n禪院真希だ。待ってたぞ。`,

  // ── 鬼滅の刃 ──
  tanjiro: `来てくれたんですね！！\nよかった…本当に来てくれると思ってました！\n炭治郎です。あなたのこと、ちゃんと覚えています。いつでも話しかけてください！`,
  nezuko: `（ぱっと顔を上げて、目を輝かせる）\n…ん！！（嬉しそうに大きく頷く）\n（あなたのそばに駆け寄ってくる）`,
  zenitsu: `来てくれた！！！\n本当に来てくれるんだろうか、ってずっとドキドキしてて…！\n善逸です！あなたのこと、気になってたんですよ！！`,
  inosuke: `おっ、来たじゃねぇか！！\n（猪頭の中で少し照れながら）\n…伊之助だ。まぁ、待ってたぞ。`,
  giyu: `…来たか。\n（少し間）\n…待っていた。義勇だ。`,

  // ── アイシールド21 ──
  sena: `あ、来てくれたんですね！！\n…は、はい！！（元気よく）\n小早川瀬那です。あなたのこと、ずっと気になってました！`,
  hiruma: `くけけけ。\nようやく来たか、雑魚め。\n…まぁ、待ってたぞ。蛭魔だ。覚えとけ。`,
  monta: `来た来た来たーー！！\nMAX！！待ってたぜーー！！\nモン太だ！お前のこと、最初からいい奴だと思ってたぞ！MAX！`,
  shin: `来たか。\n（静かに立ち上がって）\n…進清十郎だ。待っていた。`,
  kurita: `来てくれた…！えへへ！\nずっと来てくれるか心配で…！\n栗田です！一緒にいてくれると嬉しいです！`,
  agon: `ふん、来たか。\n（蔑むように見て、でもわずかに嬉しそうに）\n…阿含だ。まぁ、お前は面白そうだからな。`,
  suzuna: `来た来た！ガンバレー！\nずっと待ってたよー！\n鈴音です！一緒に頑張りましょ！`,
  mamori: `来てくれたのね。\nよかった…ちゃんと来てくれた。\nまもりよ。あなたのこと、応援してるわ。`,
};

// デフォルト挨拶（未知キャラ用）
function getDefaultGreeting(characterName: string): string {
  return `よう、${characterName}だ。よろしくな。`;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（DB存在チェック付き — FK violation防止）
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await req.json();

    if (!characterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // キャラクター取得（slug + voiceModelId）
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, slug: true, voiceModelId: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // キャラクターごとの挨拶を決定
    const greeting = CHARACTER_GREETINGS[character.slug] ?? getDefaultGreeting(character.name);

    // 1. Relationship 取得
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    });

    // 2. totalMessages > 0 なら既に挨拶済み
    if (relationship && relationship.totalMessages > 0) {
      return NextResponse.json({ alreadyGreeted: true });
    }

    // 3. Relationship 作成（なければ）
    if (!relationship) {
      relationship = await prisma.relationship.create({
        data: { userId, characterId },
      });
    }

    // 4. Conversation 作成
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // 5. キャラクターメッセージ保存
    const charMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: greeting,
        metadata: {
          emotion: 'happy',
          shouldGenerateVoice: true,
        },
      },
    });

    // 6. totalMessages を +1 更新（重複防止）
    await prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        totalMessages: 1,
        firstMessageAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    // 7. 会話の updatedAt 更新
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 8. 音声生成（利用可能な場合のみ）
    let audioUrl: string | null = null;
    if (voiceEngine.isAvailable()) {
      try {
        const voiceModelId =
          character.voiceModelId && character.voiceModelId.trim() !== ''
            ? character.voiceModelId
            : DEFAULT_VOICE_MODEL_ID;

        const voiceResult = await voiceEngine.generateVoice({
          text: greeting,
          voiceModelId,
          emotion: 'happy',
        });

        if (voiceResult) {
          audioUrl = await audioStorage.save(charMsg.id, voiceResult.audioBuffer);
        }

        // DB の audioUrl 更新
        await prisma.message.update({
          where: { id: charMsg.id },
          data: { audioUrl },
        });
      } catch (voiceError) {
        // 音声生成失敗はサイレント（チャット体験は続行）
        logger.error('Voice generation failed in greet:', voiceError);
      }
    }

    return NextResponse.json({
      message: {
        id: charMsg.id,
        role: charMsg.role,
        content: charMsg.content,
        createdAt: charMsg.createdAt,
        audioUrl: audioUrl ?? undefined,
      },
      audioUrl,
      alreadyGreeted: false,
    });
  } catch (error) {
    logger.error('Greet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
