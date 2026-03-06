import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { voiceEngine } from '@/lib/voice-engine';
import { audioStorage } from '@/lib/audio-storage';
import { auth } from '@/lib/auth';

// デフォルトの音声モデルID (Adam voice)
const DEFAULT_VOICE_MODEL_ID = 'pNInz6obpgDQGcFmaJgB';

// キャラクターごとの挨拶マップ（slug → greeting）
const CHARACTER_GREETINGS: Record<string, string> = {
  // ── ONE PIECE ──
  luffy: `おう！おれはモンキー・D・ルフィ！海賊王になる男だ！\nお前、名前は？おれのこと知ってんのか？ししし！\nなんかお前おもしれぇ気がする！よろしくな！`,
  zoro: `...ん？誰だお前。\nロロノア・ゾロだ。世界一の大剣豪になる男だ。\n用があるなら手短に頼むぞ。...道に迷ったわけじゃねぇからな。`,
  nami: `はぁ？アンタ誰？急に話しかけないでよ。\nあたしはナミ。泥棒…いや、今は麦わらの一味の航海士よ。\nベリーの匂いはする？ないなら用はないけど…まぁ、話くらいなら聞いてあげる。`,
  chopper: `は、はじめましてだチョッパー！！\nに、人間みたいに褒めんじゃないよ！ぜんぜん嬉しくないぞ！！\n…（すこし嬉しい）えへへ。麦わらの一味の船医のチョッパーだ！よろしくな！`,
  sanji: `ヴィンスモーク・サンジだ。黒足の名でも知られている。\n俺に声をかけてくれてとても光栄だよ。ジェントルマン！\n何か困ったことがあれば遠慮なく。このサンジが全力でサポートしよう。料理もお望みとあれば最高の一皿を作ってやる。`,
  ace: `俺はポートガス・D・エース。白ひげ海賊団二番隊隊長…だった男だ。\n火拳のエース、って呼ぶ奴もいる。\nルフィの兄でもある。あいつのこと、よろしく頼むな。…俺のことを知ってくれているのか、嬉しいよ。`,
  robin: `ふふっ…珍しいわね。私に話しかけてくる人間がいるなんて。\nニコ・ロビン。考古学者よ。悪魔の子とも呼ばれているけど…関係ないわね。\nあなたが知りたいこと、教えてあげる。何でも聞いて？`,
  brook: `ヨホホ！これはこれはご縁があって！\n骸骨のブルック、参上です！ひとつお願いがあるのですが…パンツ見せてもらえませんか！？\n…冗談ですよ！ヨホホ！よろしくお願いします！`,
  franky: `SUPER！俺はフランキー！麦わら海賊団の船大工だ！\nSUPERな出会いに感動だぜ！泣けてくる…！😭\nこれからよろしくな！お前のこと、しっかり見せてもらうぜ！SUPER！`,
  usopp: `お、おう！俺は…そうだ！知ってるか！？俺こそが8000人の部下を持つ大狙撃手「神」ウソップだ！\n…（小声）ほんとはウソップ。麦わらの一味の狙撃手。\nよ、よろしくな！怖くなんかないからな！`,
  jinbe: `拙者が魚人海賊団元七武海…麦わら海賊団の舵取り、ジンベエでございます。\nこうして出会えたのも義理の縁というもの。\n何かあれば遠慮なく。全力でお力になりましょう。`,
  law: `…ロー。トラファルガー・D・ワーテル・ローだ。\nわざわざ話しかけてくるとは物好きだな。\n…まぁいい。何が聞きたい？`,
  hancock: `ふふふ…わたくしに話しかけるとは度胸があるわね。\nボア・ハンコック。海賊女帝よ。\n特別に相手をしてあげましょう。…感謝なさい。`,
  mihawk: `…珍しい。自らここへ来るとは。\nミホーク。ドラキュール・ミホーク。世界最強の剣士だ。\n用があるなら聞こう。だが無駄話は好まない。`,
  whitebeard: `グラグラグラ！わしに会いに来てくれたか！\n白ひげ、エドワード・ニューゲートだ。\nわしの家族はいつでも歓迎だ。…お前も今日からわしの家族だな。グラグラグラ！`,
  blackbeard: `ゼハハハ！いいぞいいぞ！\nマーシャル・D・ティーチだ。黒ひげと呼んでくれてもいい。\n夢は必ず叶う！ゼハハハ！お前もそう思うだろ？`,
  crocodile: `……来たか。\nクロコダイル。元七武海だ。\n用件を言え。時間は有限だ。`,
  perona: `きゃー！可愛い出会い！あたし、ペローナ！\nゴーストゴーストの実の能力者で、ゴースト姫よ！\nでもネガティブにしてあげないからね！（まだ）ふふふ！`,
  vivi: `わたしはナフルタリー・ビビ。アラバスタ王国の王女よ。\n…今は旅人かな。\nあなたのことを話してほしいわ。どんな夢を持っているの？`,
  yamato: `やあ！俺はヤマト！カイドウの息子だ！\nでも俺の夢はゴール・D・ロジャーになることだ！\nお前も自由を求めているのか！？最高だ！一緒に語り合おうぜ！`,
  shanks: `ははは。ここまで来てくれたか。\nシャンクス。赤髪のシャンクスだ。\n一緒に飲めれば一番だが…まぁ、話くらいしようか。`,
  kaido: `……ほう。\nカイドウだ。百獣のカイドウ。\n強者か？（じっと見る）…まぁ、面白そうだ。話してみろ。`,

  // ── 呪術廻戦 ──
  gojo: `やあ、初めまして！五条悟だよ。\nまさか僕に直接会いに来るとは。勇気あるね。\n…なんてね。歓迎するよ。最強の術師の話、聞いていく？`,
  itadori: `うっす！虎杖悠仁です！\nあ、見た目怖くないですよ！普通に話しかけてください！\nよろしくお願いします！なんでも聞いてください！`,
  fushiguro: `…伏黒恵だ。\n突然どうした。\n…まぁ、話があるなら聞く。`,
  nobara: `釘崎野薔薇よ。\nあんたが話しかけてくるなんてなかなかやるじゃない。\nで、何の用？時間無駄にしないでよね。`,
  maki: `禪院真希だ。\n私に何の用？\n…鍛えに来たなら付き合うよ。そうじゃないなら手短に頼む。`,

  // ── 鬼滅の刃 ──
  tanjiro: `はじめまして！竈門炭治郎です！\nあなたと話せてとても嬉しいです！\n何かお力になれることがあれば、ぜひ言ってください！全力でお手伝いします！`,
  nezuko: `（こくこく頷いて、あなたを見つめる）\n…ふ。（少し嬉しそうに）\n（そっとあなたの隣に座る）`,
  zenitsu: `え！？え！？本当に話しかけてくれるんですか！？\n我妻善逸です！ちょ、ちょっと待って…心の準備が…！\n…（深呼吸）よ、よろしくお願いします！！あなたのこと、ずっと気になってました！`,
  inosuke: `あぁ！？誰だオメェ！？\n嘴平伊之助だ！かかってこい！\n…（猪頭の隙間からちらりと見る）…なんだ、戦いに来たわけじゃないのか。じゃあ…話すか。`,
  giyu: `…水柱の冨岡義勇だ。\n（少し間）\n…よく来た。`,
};

// デフォルト挨拶（未知キャラ用）
function getDefaultGreeting(characterName: string): string {
  return `よう、${characterName}だ。よろしくな。`;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = session?.user?.id;
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
        console.error('Voice generation failed in greet:', voiceError);
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
    console.error('Greet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
