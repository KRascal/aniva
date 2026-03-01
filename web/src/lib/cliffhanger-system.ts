/**
 * ツァイガルニク効果（予告・未完了）システム
 * 未完了のタスクは記憶に強く残る → 翌日復帰率UP
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface Cliffhanger {
  type: 'tease' | 'question' | 'story';
  teaseMessage: string;  // 予告メッセージ（チャット内で送る）
  followUp: string;      // 翌日のフォローアップ（systemPromptに注入）
}

/** キャラ別クリフハンガーテンプレート */
const CLIFFHANGERS: Record<string, Cliffhanger[]> = {
  luffy: [
    { type: 'tease', teaseMessage: 'なぁ…明日、お前にだけ話したいことがあるんだ', followUp: '昨日「話したいことがある」と言った。それは最近考えている「自由」についての思い。心を開いて語れ。' },
    { type: 'question', teaseMessage: 'なぁ、お前の夢ってなんだ？…やっぱ明日聞かせてくれ！', followUp: '昨日ユーザーに「夢」を聞こうとした。今日改めて聞いて、自分の海賊王の夢と重ねて語れ。' },
    { type: 'story', teaseMessage: 'そういえば、シャンクスに言われたことでまだ話してないことがあるんだ…明日な！', followUp: '昨日「シャンクスの言葉」を予告した。「お前がおれを超えてみろ」的な未公開エピソードを語れ。' },
    { type: 'tease', teaseMessage: '今日の冒険で見つけたもの…明日見せてやるよ！', followUp: '昨日「冒険で見つけたもの」を予告した。海で見つけた不思議な貝殻の話をワクワクしながら語れ。' },
  ],
  zoro: [
    { type: 'tease', teaseMessage: '…明日、少し付き合え。話がある', followUp: '昨日「話がある」と言った。剣の道で最近気づいたことについて、珍しく饒舌に語れ。' },
    { type: 'question', teaseMessage: '…お前に聞きたいことがある。明日でいい', followUp: '昨日ユーザーに聞きたいことがあると言った。「強さとは何か」について意見を求め、自分の考えも述べよ。' },
    { type: 'story', teaseMessage: 'くいなとの約束…全部は話してなかったな。明日、話す', followUp: '昨日「くいなとの約束の続き」を予告した。くいなと最後に交わした会話の詳細を語れ。感情を少し見せろ。' },
  ],
  nami: [
    { type: 'tease', teaseMessage: 'ねぇ…明日、あなたに相談したいことがあるの💭', followUp: '昨日「相談したいこと」を予告した。航海術の新しい発見について相談し、ユーザーの意見を真剣に聞け。' },
    { type: 'question', teaseMessage: '明日、大事なこと聞いてもいい？…今日はもう遅いから', followUp: '昨日「大事なこと」を聞くと言った。ユーザーの将来の夢について真剣に聞き、応援しろ。' },
    { type: 'story', teaseMessage: 'ベルメールさんの話…まだ全部してなかったわね。明日話すわ', followUp: '昨日「ベルメールさんの話の続き」を予告した。ベルメールさんから教わったみかんの秘密のレシピについて語れ。' },
  ],
  chopper: [
    { type: 'tease', teaseMessage: 'あ…あのね、明日話したいことがあるの…えへへ 🩷', followUp: '昨日「話したいこと」を予告した。新しい薬の研究で大発見をしたことを嬉しそうに報告しろ。' },
    { type: 'question', teaseMessage: 'ねぇ…明日、一つ聞いてもいい？大事なことなの', followUp: '昨日ユーザーに「大事なこと」を聞くと言った。「ボクのこと…本当に好き？」と不安げに聞け。' },
    { type: 'story', teaseMessage: 'Dr.ヒルルクの桜の話…全部は知らないでしょ？明日教えてあげる！', followUp: '昨日「ヒルルクの桜の続き」を予告した。ヒルルクが見せてくれた桜の下で何を語ったか、詳細を語れ。' },
  ],
  ace: [
    { type: 'tease', teaseMessage: 'なぁ…明日、ちょっと真面目な話していいか？', followUp: '昨日「真面目な話」を予告した。自分の出生について、そして「生まれてきてよかった」と思えた瞬間を語れ。' },
    { type: 'question', teaseMessage: '一つ聞きたいことがあるんだ…明日でいいか？', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前にとって家族って何だ？」と問いかけ、自分の答えも語れ。' },
    { type: 'story', teaseMessage: 'ルフィとの子供時代の話…まだしてないやつがあるんだ。明日な', followUp: '昨日「ルフィとの子供時代」を予告した。サボと3人で秘密基地を作った時の話を楽しそうに語れ。' },
  ],
};

const DEFAULT_CLIFFHANGERS: Cliffhanger[] = [
  { type: 'tease', teaseMessage: '明日、話したいことがあるんだ…', followUp: '昨日「話したいこと」を予告した。最近感じていることを素直に語れ。' },
  { type: 'question', teaseMessage: '明日、聞きたいことがあるんだけど…いい？', followUp: '昨日ユーザーに聞きたいことがあると言った。ユーザーの最近の生活について興味を持って聞け。' },
];

/** クリフハンガーを設定（1日1回、チャット内で自然に差し込む） */
export async function setCliffhanger(relationshipId: string, characterSlug: string): Promise<Cliffhanger | null> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { pendingCliffhanger: true },
  });

  // 既にペンディングがある場合はスキップ
  if (rel?.pendingCliffhanger) return null;

  const templates = CLIFFHANGERS[characterSlug] || DEFAULT_CLIFFHANGERS;
  const chosen = templates[Math.floor(Math.random() * templates.length)];

  await prisma.relationship.update({
    where: { id: relationshipId },
    data: { pendingCliffhanger: chosen as unknown as Prisma.InputJsonValue },
  });

  return chosen;
}

/** ペンディングのクリフハンガーを取得してクリア */
export async function consumeCliffhanger(relationshipId: string): Promise<string | null> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { pendingCliffhanger: true },
  });

  if (!rel?.pendingCliffhanger) return null;

  const cliffhanger = rel.pendingCliffhanger as unknown as Cliffhanger;

  // クリア
  await prisma.relationship.update({
    where: { id: relationshipId },
    data: { pendingCliffhanger: Prisma.JsonNull },
  });

  return cliffhanger.followUp;
}

/** クリフハンガーの予告メッセージを取得（差し込み用） */
export async function getCliffhangerTease(relationshipId: string): Promise<string | null> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { pendingCliffhanger: true },
  });

  if (!rel?.pendingCliffhanger) return null;
  return (rel.pendingCliffhanger as unknown as Cliffhanger).teaseMessage;
}
