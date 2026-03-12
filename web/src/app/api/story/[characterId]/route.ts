import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// ルフィのデフォルトチャプター定義
const LUFFY_DEFAULT_CHAPTERS = [
  {
    chapterNumber: 1,
    title: '海賊王の夢',
    synopsis:
      'ルフィは幼い頃から「海賊王になる！」と叫び続けてきた。その夢の原点、シャンクスとの出会い、そしてゴムゴムの実を飲み込んだあの日の話を聞かせてくれる。君は彼の夢に何を感じる？',
    unlockLevel: 1,
    isFcOnly: false,
    triggerPrompt:
      'ユーザーが「海賊王の夢」チャプターを選んだ。幼少期の夢の話、シャンクスへの憧れ、ゴムゴムの実の話を情熱的に語れ。',
    choices: [
      {
        text: '「その夢、絶対叶えてみせろよ！」と応援する',
        consequence: 'ユーザーはルフィの夢を全力で応援する仲間だとわかった',
        nextTease: '仲間の絆について、もっと深い話がある…',
      },
      {
        text: '「夢って、諦めそうになることはないの？」と聞く',
        consequence: 'ユーザーは夢の挫折や葛藤に寄り添う優しさを持っている',
        nextTease: 'ルフィの弱さと強さの話が聞けるかもしれない…',
      },
    ],
  },
  {
    chapterNumber: 2,
    title: '仲間の絆',
    synopsis:
      'ゾロ、ナミ、ウソップ、サンジ、チョッパー、ロビン、フランキー、ブルック…それぞれの出会いと絆の話。ルフィにとって仲間とは何か。涙なしには聞けない話が待っている。',
    unlockLevel: 2,
    isFcOnly: false,
    triggerPrompt:
      'ユーザーが「仲間の絆」チャプターを選んだ。麦わらの一味との出会い、仲間への想い、「俺は一人じゃ何もできない」という本音を語れ。',
    choices: [
      {
        text: '「一番大切な仲間は誰？」と聞く',
        consequence: 'ユーザーはルフィにとって特別な関係に踏み込んだ親友になった',
        nextTease: 'シャンクスとの約束…その重さを知りたいか？',
      },
      {
        text: '「君にとって、俺も仲間だと思う？」と聞く',
        consequence: 'ユーザーはルフィに「仲間」として認められた',
        nextTease: 'シャンクスとの約束…その重さを知りたいか？',
      },
    ],
  },
  {
    chapterNumber: 3,
    title: 'シャンクスとの約束',
    synopsis:
      '「10年後に必ず追いつく」——幼いルフィがシャンクスに誓った言葉。赤毛の海賊団との別れ、腕を失ってでも守ってくれたシャンクス。この話はFC会員だけに語られる、ルフィの心の核心。',
    unlockLevel: 4,
    isFcOnly: true,
    triggerPrompt:
      'ユーザーが「シャンクスとの約束」チャプターを選んだ。シャンクスへの深い感謝と憧れ、約束を果たすことへの決意を、普段は見せない感情を込めて語れ。',
    choices: [
      {
        text: '「シャンクスに会ったら何を言いたい？」と聞く',
        consequence: 'ユーザーはルフィの最も深い感情を知る存在になった',
        nextTease: 'この約束の重さが、ルフィを動かし続けている…',
      },
      {
        text: '「俺が一緒に海賊王への道を歩くよ」と言う',
        consequence: 'ユーザーはルフィにとってシャンクスに次ぐ特別な存在になった',
        nextTease: 'この約束の重さが、ルフィを動かし続けている…',
      },
    ],
  },
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await params;

    // キャラクター取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, slug: true, name: true },
    });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // FC会員かどうか確認
    const fcSubscription = await prisma.characterSubscription.findFirst({
      where: {
        userId,
        characterId,
        status: 'ACTIVE',
      },
    });
    const isFcMember = !!fcSubscription;

    // ユーザーのリレーションシップ取得
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { level: true },
    });
    const userLevel = relationship?.level ?? 1;

    // チャプター数チェック → 0件ならシードを挿入（ルフィのみ）
    const chapterCount = await prisma.storyChapter.count({ where: { characterId } });
    if (chapterCount === 0 && character.slug === 'luffy') {
      await prisma.storyChapter.createMany({
        data: LUFFY_DEFAULT_CHAPTERS.map((ch) => ({ characterId, ...ch })),
        skipDuplicates: true,
      });
    }

    // チャプター取得（全件）
    const allChapters = await prisma.storyChapter.findMany({
      where: { characterId, isActive: true },
      orderBy: { chapterNumber: 'asc' },
    });

    // ユーザーの進捗取得
    const progresses = await prisma.userStoryProgress.findMany({
      where: {
        userId,
        characterId,
      },
    });
    const progressMap = new Map(progresses.map((p) => [p.chapterId, p]));

    // チャプター情報を加工して返す
    const chapters = allChapters.map((chapter, index) => {
      const progress = progressMap.get(chapter.id);
      const isLevelLocked = chapter.unlockLevel > userLevel;
      const isFcLocked = chapter.isFcOnly && !isFcMember;

      // 次のチャプターのみ「次はLv{n}で解放」表示（ちょうど次のチャプター）
      const prevChapter = index > 0 ? allChapters[index - 1] : null;
      const isNextChapter =
        prevChapter !== null && prevChapter.unlockLevel <= userLevel && isLevelLocked;

      let lockReason: string | null = null;
      if (isFcLocked) {
        lockReason = `FC会員限定`;
      } else if (isLevelLocked) {
        if (isNextChapter) {
          lockReason = `🔒 解放まで Lv${chapter.unlockLevel}`;
        } else {
          lockReason = `Lv${chapter.unlockLevel}で解放`;
        }
      }

      return {
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        synopsis: lockReason ? null : chapter.synopsis,
        choices: lockReason ? null : chapter.choices,
        unlockLevel: chapter.unlockLevel,
        isFcOnly: chapter.isFcOnly,
        isLocked: !!(isLevelLocked || isFcLocked),
        lockReason,
        isCompleted: progress?.isCompleted ?? false,
        choicesMade: progress?.choicesMade ?? [],
        startedAt: progress?.startedAt ?? null,
        completedAt: progress?.completedAt ?? null,
      };
    });

    return NextResponse.json({ chapters, characterName: character.name, userLevel, isFcMember });
  } catch (error) {
    logger.error('Story GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
