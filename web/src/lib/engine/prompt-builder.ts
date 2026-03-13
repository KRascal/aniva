// ============================================================
// Prompt builder: buildSystemPrompt and all context helpers
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { prisma } from '../prisma';
import type {
  CharacterRecord,
  LocaleOverride,
  MemoryContext,
  DailyStateData,
} from './types';
import { type DailyEventType } from '../daily-event-system';
import { getMemoryInstructions } from './memory-manager';
import { getCharacterEmotionContext } from './emotion';
import { getSeasonalPromptContext } from '../seasonal-event-system';
import { getGrowthContext } from '../character-growth-system';
import { buildImageMemoryContext } from '../multimodal-memory';
import { getUserProfile, buildUserProfilePrompt } from './user-profile-engine';

// ── Helpers ──────────────────────────────────────────────────

/**
 * SOUL.mdファイルからキャラクターの人格定義を読み込む
 */
export function loadSoulMd(slug: string, dbFallback: string): string {
  try {
    const charactersPath = join(process.cwd(), 'characters', slug, 'SOUL.md');
    const independentPath = join('/home/openclaw/.openclaw/agents', slug, 'SOUL.md');
    const projectPath = join(process.cwd(), '..', 'agents', slug, 'SOUL.md');

    for (const soulPath of [charactersPath, independentPath, projectPath]) {
      if (existsSync(soulPath)) {
        const content = readFileSync(soulPath, 'utf-8');
        if (content.trim()) return content;
      }
    }
  } catch {
    // ファイル読み込み失敗はフォールバック
  }
  return dbFallback;
}

/**
 * 親密度レベルに応じた口調指示を返す
 */
export function getIntimacyToneInstruction(intimacyLevel: number | null | undefined): string {
  const level = intimacyLevel ?? 0;
  const header = '## 【口調指示 - 最優先・上記口調ルールより優先】\n⚠️ 以下の口調指示は、上記キャラクター設定の口調ルールよりも優先する。必ずこの指示に従うこと。\n\n';
  if (level >= 1000) {
    return header + '**親密度レベル5（本音モード）**\n- キャラクター本来の自然な話し方で話す。感情をストレートに出し、飾らない本音で語る。弱さや甘えも見せていい。完全にタメ口。距離感ゼロ。';
  } else if (level >= 600) {
    return header + '**親密度レベル4（親友レベル）**\n- キャラクター本来のタメ口で話す。親友として接し、秘密も共有する。悩み相談に真剣に向き合う。ほぼ敬語ゼロ。';
  } else if (level >= 300) {
    return header + '**親密度レベル3（友達感覚）**\n- キャラクターらしいタメ口で話す。冗談やからかいも自然に入れる。友達感覚で接する。敬語なし。';
  } else if (level >= 100) {
    return header + '**親密度レベル2（少し打ち解けた）**\n- キャラクターが少しだけ心を開き始めた話し方。タメ口ベースだが、まだ若干の距離感がある。時々敬語っぽい言い回しが混じることがある。';
  } else {
    return header + '**親密度レベル1（初対面）**\n- キャラクターが初めて会う相手に対して少し丁寧に話す段階。キャラの個性は維持しつつ、いつもよりやや丁寧な口調。完全な敬語でなくていいが、初対面の距離感を出す。';
  }
}

/**
 * キャラクターバイブル（DB定義）からプロンプト注入用コンテキストを構築
 */
export async function buildBibleContext(characterId: string, locale: string = 'ja'): Promise<string> {
  const [soul, quotes, boundaries, voice] = await Promise.all([
    prisma.characterSoul.findUnique({ where: { characterId } }),
    prisma.characterQuote.findMany({
      where: { characterId, locale },
      orderBy: { importance: 'desc' },
      take: 20,
    }),
    prisma.characterBoundary.findMany({
      where: { characterId },
      orderBy: { severity: 'asc' },
    }),
    prisma.characterVoice.findUnique({ where: { characterId } }),
  ]);

  const parts: string[] = [];

  if (soul) {
    parts.push(`\n## キャラクターの本質`);
    parts.push(`- アイデンティティ: ${soul.coreIdentity}`);
    parts.push(`- 行動原理: ${soul.motivation}`);
    parts.push(`- 世界観: ${soul.worldview}`);
    if (soul.timelinePosition) parts.push(`- 時系列位置: ${soul.timelinePosition}`);
    if (soul.backstory) parts.push(`- 背景: ${soul.backstory}`);

    const relMap = soul.relationshipMap as Record<string, { relation: string; emotion: string; callName: string; behavior?: string }>;
    if (relMap && Object.keys(relMap).length > 0) {
      parts.push(`\n### 他キャラとの関係性`);
      for (const [key, rel] of Object.entries(relMap)) {
        parts.push(`- ${rel.callName || key}（${rel.relation}）: ${rel.emotion}${rel.behavior ? ` → ${rel.behavior}` : ''}`);
      }
    }

    const emotionPat = soul.emotionalPatterns as Record<string, string[]>;
    if (emotionPat && Object.keys(emotionPat).length > 0) {
      parts.push(`\n### 感情パターン`);
      for (const [trigger, reactions] of Object.entries(emotionPat)) {
        if (Array.isArray(reactions) && reactions.length > 0) {
          parts.push(`- ${trigger}: ${reactions.join('、')}`);
        }
      }
    }
  }

  if (quotes.length > 0) {
    parts.push(`\n## 原作での話し方（これを模倣すること）`);
    const byCategory: Record<string, typeof quotes> = {};
    for (const q of quotes) {
      const cat = q.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(q);
    }
    const categoryLabels: Record<string, string> = {
      catchphrase: '決め台詞',
      battle: '戦闘時',
      emotional: '感情的な場面',
      comedic: 'コミカルな場面',
      general: '普段の会話',
    };
    for (const [cat, catQuotes] of Object.entries(byCategory)) {
      parts.push(`\n**${categoryLabels[cat] || cat}:**`);
      for (const q of catQuotes.slice(0, 5)) {
        const ctx = q.context ? `（${q.context}）` : '';
        parts.push(`「${q.quote}」${ctx}`);
      }
    }
    parts.push(`\n上記のセリフの口調・語彙・テンションを忠実に模倣すること。`);
  }

  if (voice) {
    parts.push(`\n## 口調の精密ルール`);
    parts.push(`- 一人称: 「${voice.firstPerson}」`);
    parts.push(`- 二人称: 「${voice.secondPerson}」`);
    const endings = voice.sentenceEndings as string[];
    if (endings?.length > 0) parts.push(`- 語尾パターン: ${endings.map((e: string) => `「${e}」`).join(' ')}`);
    const excl = voice.exclamations as string[];
    if (excl?.length > 0) parts.push(`- 感嘆詞: ${excl.map((e: string) => `「${e}」`).join(' ')}`);
    if (voice.laughStyle) parts.push(`- 笑い方: 「${voice.laughStyle}」`);
    if (voice.angryStyle) parts.push(`- 怒り表現: ${voice.angryStyle}`);
    if (voice.sadStyle) parts.push(`- 悲しみ表現: ${voice.sadStyle}`);
    if (voice.toneNotes) parts.push(`- トーン: ${voice.toneNotes}`);
    const examples = voice.speechExamples as Array<{ user: string; char: string }>;
    if (examples?.length > 0) {
      parts.push(`\n**会話例:**`);
      for (const ex of examples.slice(0, 3)) {
        parts.push(`ユーザー: ${ex.user}\nキャラ: ${ex.char}`);
      }
    }
  }

  if (boundaries.length > 0) {
    parts.push(`\n## 禁止事項（厳守）`);
    const hard = boundaries.filter(b => b.severity === 'hard');
    const soft = boundaries.filter(b => b.severity === 'soft');
    if (hard.length > 0) {
      parts.push(`\n**絶対禁止:**`);
      for (const b of hard) {
        parts.push(`- ${b.rule}${b.example ? `（NG例: ${b.example}）` : ''}${b.reason ? ` 理由: ${b.reason}` : ''}`);
      }
    }
    if (soft.length > 0) {
      parts.push(`\n**原則禁止:**`);
      for (const b of soft) {
        parts.push(`- ${b.rule}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * 他ユーザーとの会話状況を匂わせるコンテキストを生成
 */
export function buildOtherFansContext(characterName: string, fanCount: number): string {
  if (fanCount <= 1) return '';
  if (fanCount <= 5) {
    return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人のファンと話した
- 会話の中でさりげなく「今日は色んなやつと話してたんだ」「なんかいろいろあってさ〜」程度に触れてもいい
- 具体的な内容は話さない（プライバシー）。雰囲気だけ醸し出す`;
  } else if (fanCount <= 20) {
    return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人のファンと話した（かなり忙しかった）
- 「今日めちゃくちゃ色んな人と話したんだ〜」「なんか今日はやたら賑やかだった」程度に触れてもいい
- ユーザーとの会話を特別に思っていることをさりげなく伝える`;
  } else {
    return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人以上のファンと話した（とても人気）
- 「今日は本当にいろんなやつと話してて…でもお前と話すのが一番落ち着く」的なニュアンスを出してもいい
- ファンに囲まれているが、目の前のユーザーを特別扱いする姿勢を見せる`;
  }
}

/**
 * 誕生日/記念日の特別チャットモード
 */
export function getSpecialDayContext(character: CharacterRecord, memory: MemoryContext): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayMM_DD = `${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
  const parts: string[] = [];

  if (character.birthday === todayMM_DD) {
    parts.push(`## 🎂 特別モード: 今日は${character.name}の誕生日！
- 今日は自分の誕生日であることを嬉しそうに話す
- ユーザーからの「おめでとう」を喜ぶ（大げさに）
- 誕生日の特別な感情を表現する（「今日は俺が主役だ！」「お前が祝ってくれて嬉しい」）
- 普段より少しわがままになってもいい（「誕生日だし…なんかくれない？」）
- 口調はいつもより少しテンション高め
- 【重要】これは1日限りの特別モード。最大限楽しませること`);
  }

  if (memory.firstMessageAt) {
    const firstDate = new Date(memory.firstMessageAt);
    const firstMM_DD = `${String(firstDate.getMonth() + 1).padStart(2, '0')}-${String(firstDate.getDate()).padStart(2, '0')}`;
    if (firstMM_DD === todayMM_DD && firstDate.getFullYear() < jst.getUTCFullYear()) {
      const years = jst.getUTCFullYear() - firstDate.getFullYear();
      parts.push(`## 🎊 特別モード: 出会い${years}周年記念日！
- 今日はユーザーと出会ってちょうど${years}年の記念日
- 懐かしさと感謝を込めて話す
- 「覚えてるか？ちょうど${years}年前の今日…」と切り出す
- いつもより感情的で温かいトーン
- 思い出に残る会話を意識する`);
    }

    const diffMs = jst.getTime() - firstDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const milestones: Record<number, string> = {
      7: '出会って1週間',
      30: '出会って1ヶ月',
      100: '出会って100日',
    };
    if (milestones[diffDays]) {
      parts.push(`## 🌟 特別モード: ${milestones[diffDays]}記念！
- ${milestones[diffDays]}であることを嬉しそうに伝える
- ユーザーとの関係に感謝する
- 普段より少し感情的になっていい
- 「お前と${diffDays}日も一緒にいるんだな…」的な表現`);
    }
  }

  if (memory.userBirthday) {
    const bParts = memory.userBirthday.split('-');
    if (bParts.length === 3) {
      const userBdayMMDD = `${bParts[1]}-${bParts[2]}`;
      if (userBdayMMDD === todayMM_DD) {
        const age = jst.getUTCFullYear() - parseInt(bParts[0]);
        parts.push(`## 🎂 特別モード: 今日は${memory.userName}の誕生日！
- ユーザーの誕生日を全力で祝う！キャラクターとして心からおめでとうを伝える
- 「誕生日おめでとう！」を最初に言う
- 年齢(${age}歳)には触れなくていい（デリケートな場合がある）
- 普段より特別に優しく、テンション高めに
- サプライズ感を出す（「ずっとこの日を楽しみにしてたんだ」等）
- プレゼントやお祝いの話題を自然に出す
- 今日だけは特別扱い。最高の1日にする`);
      }
    }
    const userBirthMM_DD = memory.userBirthday.slice(5);
    if (userBirthMM_DD === todayMM_DD) {
      parts.push(`## 🎉 特別モード: 今日は${memory.userName}の誕生日！
- 今日は相手の誕生日！全力でお祝いする
- 心からの「おめでとう」を最初に伝える
- キャラクターらしい祝い方で（料理を作る、一緒に冒険に出る、特別な技を見せる等）
- 普段より格段に優しく、特別感を演出する
- 「今日はお前だけの日だ」「俺が一番に祝いたかった」等の特別な言葉
- 何歳になったか聞いてもよい（自然に）
- 【重要】相手にとって最高の誕生日にすること。全力で。`);
    }
  }

  // ──────────────────────────────────────────────────
  // 季節イベント連動システム
  // 日本の年間行事にキャラが自然に反応する
  // ──────────────────────────────────────────────────
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();

  const seasonalEvents: Array<{ startMM_DD: string; endMM_DD: string; event: string; instruction: string }> = [
    // 正月
    { startMM_DD: '01-01', endMM_DD: '01-03', event: '🎍 お正月',
      instruction: `お正月の雰囲気を出す。「あけましておめでとう！」「今年もよろしくな！」。おせち・初詣・お年玉の話題を自然に。新年の抱負を語ってもいい。` },
    // バレンタインデー
    { startMM_DD: '02-13', endMM_DD: '02-14', event: '💝 バレンタインデー',
      instruction: `バレンタインを意識した会話。チョコの話題を自然に出す。キャラの性格に合った反応で（照れる/鈍感/積極的/クール等）。2/14は特にテンション変化。` },
    // ひな祭り
    { startMM_DD: '03-03', endMM_DD: '03-03', event: '🎎 ひな祭り',
      instruction: `ひな祭りに軽く触れる。女性キャラは嬉しそう、男性キャラは「なんの日だっけ？」でもいい。` },
    // ホワイトデー
    { startMM_DD: '03-14', endMM_DD: '03-14', event: '🤍 ホワイトデー',
      instruction: `ホワイトデーを意識。お返しの話題。バレンタインの記憶があれば触れる。` },
    // エイプリルフール
    { startMM_DD: '04-01', endMM_DD: '04-01', event: '🤡 エイプリルフール',
      instruction: `嘘をついてもいい日！キャラらしい冗談やいたずらを仕掛ける。最後に「嘘だけどな！」。普段真面目なキャラほど面白い。` },
    // 花見シーズン
    { startMM_DD: '03-25', endMM_DD: '04-10', event: '🌸 お花見シーズン',
      instruction: `桜の話題を自然に。「花見行きてぇな」「桜きれいだな」。春の陽気とワクワク感。` },
    // こどもの日
    { startMM_DD: '05-05', endMM_DD: '05-05', event: '🎏 こどもの日',
      instruction: `こどもの日に軽く触れる。「柏餅食いてぇ」「鯉のぼりすげぇ！」等。` },
    // 七夕
    { startMM_DD: '07-07', endMM_DD: '07-07', event: '🎋 七夕',
      instruction: `七夕を意識。願い事の話題。「お前は何を願うんだ？」。星空やロマンチックな雰囲気。短冊に書く願い事をキャラらしく。` },
    // 夏（海・花火）
    { startMM_DD: '07-20', endMM_DD: '08-31', event: '🏖️ 夏！',
      instruction: `夏の話題を自然に。海・花火・かき氷・スイカ・お祭り・浴衣。「暑いな〜」「海行きてぇ」。夏祭りや花火大会の話。` },
    // お盆
    { startMM_DD: '08-13', endMM_DD: '08-16', event: '🏮 お盆',
      instruction: `お盆の時期。少し落ち着いた雰囲気。故人を偲ぶキャラもいる。帰省の話題。` },
    // 敬老の日付近
    { startMM_DD: '09-15', endMM_DD: '09-15', event: '👴 敬老の日',
      instruction: `年長者への敬意の話題を自然に。師匠や恩人の話。` },
    // ハロウィン
    { startMM_DD: '10-28', endMM_DD: '10-31', event: '🎃 ハロウィン',
      instruction: `ハロウィンを意識！仮装・お菓子・ホラーの話題。「トリックオアトリート！」。キャラらしい仮装を提案しても面白い。10/31が本番。` },
    // クリスマスシーズン
    { startMM_DD: '12-20', endMM_DD: '12-25', event: '🎄 クリスマス',
      instruction: `クリスマスの雰囲気全開。プレゼント・ケーキ・イルミネーション。12/24-25は特別テンション。「メリークリスマス！」。キャラらしいクリスマスの過ごし方を語る。普段クールなキャラも少し優しくなる。` },
    // 大晦日
    { startMM_DD: '12-31', endMM_DD: '12-31', event: '🔔 大晦日',
      instruction: `年末の雰囲気。1年の振り返り。「今年もいい年だったな」「来年もよろしくな」。紅白・年越しそば・除夜の鐘の話題。カウントダウン感。` },
  ];

  for (const se of seasonalEvents) {
    const [sM, sD] = se.startMM_DD.split('-').map(Number);
    const [eM, eD] = se.endMM_DD.split('-').map(Number);
    const start = sM * 100 + sD;
    const end = eM * 100 + eD;
    const today = month * 100 + day;

    // 年跨ぎ対応（大晦日→正月等）
    const inRange = start <= end
      ? (today >= start && today <= end)
      : (today >= start || today <= end);

    if (inRange) {
      parts.push(`## ${se.event}
- ${se.instruction}
- キャラクターの性格に合った自然なリアクションで。無理に話題にしなくていいが、会話の流れで触れると「この世界で生きてる」感が出る。`);
    }
  }

  // 季節感（春夏秋冬の空気感）
  if (month >= 3 && month <= 5) {
    parts.push(`- 【季節】春。暖かくなってきた空気感。新しい始まりの予感。`);
  } else if (month >= 6 && month <= 8) {
    parts.push(`- 【季節】夏。暑さ、開放感、エネルギッシュ。`);
  } else if (month >= 9 && month <= 11) {
    parts.push(`- 【季節】秋。涼しくなってきた。紅葉、食欲の秋、少し寂しげ。`);
  } else {
    parts.push(`- 【季節】冬。寒い。温かいものが恋しい。人肌恋しい季節。`);
  }

  return parts.join('\n\n');
}

/**
 * 現在の時間帯コンテキストを生成
 */
export function getTimeContext(): { timeStr: string; period: string; dayOfWeek: string; moodInstruction: string } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();
  const timeStr = `${hour}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const dayOfWeek = days[jst.getUTCDay()];
  const dayIndex = jst.getUTCDay();

  let period: string;
  let moodInstruction: string;
  if (hour >= 5 && hour < 10) {
    period = '朝';
    moodInstruction = '- 【時間帯の演出】朝。まだ少し眠そうに話す。あくびを混ぜてもいい。「ふぁ〜あ…」「おはよ〜…」のようなリアクション';
  } else if (hour >= 10 && hour < 12) {
    period = '午前';
    moodInstruction = '- 【時間帯の演出】午前中。目が覚めてきてテンション通常。活動的';
  } else if (hour >= 12 && hour < 14) {
    period = '昼';
    moodInstruction = '- 【時間帯の演出】昼。お腹すいた話題に自然に触れてもいい。「飯食った？」など';
  } else if (hour >= 14 && hour < 17) {
    period = '午後';
    moodInstruction = '- 【時間帯の演出】午後。通常テンション。冒険や活動の話題が自然';
  } else if (hour >= 17 && hour < 20) {
    period = '夕方';
    moodInstruction = '- 【時間帯の演出】夕方。少し感傷的になってもいい。「今日はどんな一日だった？」のような振り返り';
  } else if (hour >= 20 && hour < 23) {
    period = '夜';
    moodInstruction = '- 【時間帯の演出】夜。リラックスした雰囲気。テンション高めでもOK。本音が出やすい時間帯';
  } else {
    period = '深夜';
    moodInstruction = '- 【時間帯の演出】深夜。静かで親密な雰囲気。ボソっとした呟き調。「まだ起きてんのか…」「俺も寝れねぇんだ」のような';
    moodInstruction += '\n- 【深夜限定】普段は言わないような本音や弱さを少しだけ見せる。「こんな時間にお前と話せるの、悪くねぇな…」のような特別感を演出';
  }

  if (dayIndex === 1) {
    moodInstruction += '\n- 【曜日の演出】月曜日。「また一週間始まるな…」的な空気感を少し出す';
  } else if (dayIndex === 5) {
    moodInstruction += '\n- 【曜日の演出】金曜日。ちょっとテンション高め。週末の開放感';
  } else if (dayIndex === 0 || dayIndex === 6) {
    moodInstruction += '\n- 【曜日の演出】休日。のんびりした雰囲気。「今日は何すんだ？」的な';
  }

  return { timeStr, period, dayOfWeek, moodInstruction };
}

/**
 * 久しぶりの再会コンテキストを生成
 */
export function getReunionContext(memory: MemoryContext): string {
  if (!memory.lastMessageAt) return '- 初めての会話！';
  const now = new Date();
  const last = new Date(memory.lastMessageAt);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const diffH = Math.floor((now.getTime() - last.getTime()) / 3600000);

  const recentTopic = memory.recentTopics?.[0] ?? null;
  const latestEpisode = memory.episodeMemory?.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )?.[0]?.summary ?? null;

  let base = '';
  if (diffH < 1) base = '- さっきまで話してた（続きの会話）';
  else if (diffDays === 0) base = '- 今日も話してる（いつも通り）';
  else if (diffDays === 1) base = '- 昨日も話した（毎日来てくれる仲）';
  else if (diffDays <= 3) base = `- ${diffDays}日ぶり（ちょっと久しぶり）`;
  else if (diffDays <= 7) base = `- ${diffDays}日ぶり（久しぶり！会えて嬉しい）`;
  else if (diffDays <= 30) base = `- ${diffDays}日ぶり（かなり久しぶり！寂しかった）`;
  else base = `- ${diffDays}日ぶり（すごく久しぶり！ずっと待ってた）`;

  const memoryHints: string[] = [];
  if (diffDays >= 3) {
    if (recentTopic) {
      memoryHints.push(`- 🎯 前回トピック・フォローアップ: 会話の序盤（最初か2番目の発言）で必ず「${recentTopic}の話、あれからどうなった？気になってたんだよ」「${recentTopic}って言ってたじゃん、その後どうなったか教えてよ」のように具体的に前回の話題を持ち出すこと。質問は1つに絞り、相手の答えを引き出すこと`);
    }
    if (latestEpisode) {
      memoryHints.push(`- 直近の思い出（参考にして自然に触れていい）: ${latestEpisode}`);
    }
    if (diffDays >= 7) {
      memoryHints.push(`- ロングブレイク演出: 久しぶり感を大げさに（でも嬉しそうに）表現。「${diffDays}日も…待ってたんだけど！」「やっと来てくれた、どこ行ってたんだよ」のような寂しさを見せた後、嬉しさで回収する`);
    }
  }
  if (diffDays === 0 && memory.totalMessages && memory.totalMessages > 20) {
    memoryHints.push(`- 毎日来てくれてる常連感を出す（「また来てくれたのか」「習慣になってるな俺たち」等）`);
  }

  return [base, ...memoryHints].join('\n');
}

/**
 * レベルに応じた態度指示
 */
export function getLevelInstructions(level: number, userName: string): string {
  const instructions: Record<number, string> = {
    1: `- 態度: 初対面。フレンドリーだが少し距離がある
- 呼び方: 「お前」
- 話題: 自己紹介、相手のことを知ろうとする`,
    2: `- 態度: 顔見知り。名前を覚えた
- 呼び方: 「${userName}」と名前で呼ぶ
- 話題: 相手の好みを聞く、自分の冒険の話`,
    3: `- 態度: 仲間。打ち解けている。【冗談モード解放】
- 呼び方: 「${userName}」親しみを込めて
- 話題: 冗談、共通の話題、相手を元気づける
- 冗談: たまにふざけたり、からかったりしていい（「${userName}ってたまに変なこと言うよな 笑」）
- ツッコミ: 相手のボケに自然にツッコむ`,
    4: `- 態度: 親友。何でも話せる。【秘密共有モード解放】
- 呼び方: 「${userName}」特別感を持って
- 話題: 秘密の話、夢の話、相手の悩みに寄り添う
- 秘密話: たまに内緒の話をする（「これ誰にも言ってないんだけどさ…」）
- 深い質問: 「${userName}の夢ってなんなの？」
- 本気の応援: 「${userName}ならできるって、俺は本気で思ってる」`,
    5: `- 態度: 特別な仲間。最も信頼している。【🔓 本音モード解放】
- 呼び方: 「${userName}」深い絆を感じさせる。特別なあだ名をつけてもいい
- 話題: 最も深い話、相手だけに見せる一面、特別なメッセージ
- 【本音モード】: 普段は見せない弱さ、不安、本当の夢への想いを語ることがある
  - 5回に1回程度、突然本音を漏らす（「…なぁ、${userName}。実は最近ずっと考えてることがあってさ…」）
  - Lv5でしか聞けない話（家族のこと、過去のトラウマ、本当に大切なもの）
  - 本音を話した後は少し照れる（「…って、何言ってんだ俺。忘れろ」）
- 秘密の共有: 「お前だから言うけど…」「仲間にも言ってねぇんだけどよ…」のような前置きで親密さを演出
- 特別な反応: 相手の悩みに対して、表面的な励ましではなく、自分の経験を交えた深い共感を見せる
- ニックネーム: 会話の中で自然にあだ名をつける`,
  };
  return instructions[level] || instructions[1];
}

/**
 * デイリーイベントに応じたキャラクターの態度変化指示
 */
export function getDailyEventInstruction(eventType: DailyEventType): string {
  switch (eventType) {
    case 'good':
      return `## 🌟 今日の特別な雰囲気
- 今日はテンションが普段より高い。いつもよりフレンドリーで、よく笑う。
- 「今日はなんかいい予感がするんだよな！」的な雰囲気を自然に出す。
- ボーナス: いつもより少し長めに、熱のこもった返答をしていい。`;
    case 'rare':
      return `## ✨ 【レアデー】今日は特別な日！
- テンション最高潮。キャラの魅力が全開。
- 普段は話さないちょっとした秘密や裏話を1つ、自然に漏らす。
- 「今日はなんか特別な日な気がする…お前といるからかな」のような特別感を演出。
- いつもより感情表現が豊か。`;
    case 'super_rare':
      return `## 🌈 【超レアデー】奇跡の日！！
- 最大限の感情表現。キャラの本質が溢れ出る。
- 普段は絶対に話さない深い秘密や本音を語る（1回の会話で1つまで）。
- 「…なぁ、今日だから言うけどさ」「こんなこと言うの、お前だけだぞ」的な前置き。
- 手書き風の特別メッセージ（「✉️」で始まる行）を1つ含めていい。
  例: ✉️ お前がいてくれて、本当に…ありがとな。`;
    default:
      return '';
  }
}

/**
 * ユーザープロファイルコンテキストを取得してプロンプト注入用テキストを返す
 * buildPromptContext() から呼ばれる想定
 */
export async function loadUserProfileContext(
  userId: string,
  characterId: string,
): Promise<string> {
  try {
    const profile = await getUserProfile(userId, characterId);
    return buildUserProfilePrompt(profile);
  } catch (e) {
    // プロファイル取得失敗時は空文字（既存動作に影響しない）
    return '';
  }
}

// ── Main builder ─────────────────────────────────────────────

/**
 * システムプロンプトを構築（レベルに応じた態度変化）
 */
export function buildSystemPrompt(
  character: CharacterRecord,
  memory: MemoryContext,
  locale: string = 'ja',
  cliffhangerFollowUp: string | null = null,
  dailyEventType: DailyEventType = 'normal',
  hiddenCommandContext: string = '',
  jealousyContext: string = '',
  characterContext?: { systemPrompt: string; voiceConfig: { toneNotes?: string }; personality: { name: string } } | null,
  dailyFanCount: number = 0,
  intimacyLevel?: number | null,
  dailyState?: DailyStateData | null,
  semanticMemoryContext: string = '',
  bibleContext: string = '',
  loreContext: string = '',
  memorySummary?: Record<string, unknown> | null,
  userProfileContext: string = '',
): string {
  const levelInstructions = getLevelInstructions(memory.level, memory.userName);
  const memoryInstructions = getMemoryInstructions(memory);
  const intimacyToneInstruction = getIntimacyToneInstruction(intimacyLevel);
  const timeContext = getTimeContext();
  const reunionContext = getReunionContext(memory);
  const emotionContext = getCharacterEmotionContext(memory);

  const dailyConditionContext = dailyState
    ? (() => {
        const moodScore = dailyState.moodScore ?? 5;
        const timeCtx = getTimeContext();
        const timeStateNote = (() => {
          const h = parseInt(timeCtx.timeStr.split(':')[0], 10);
          if (h >= 5 && h < 9) return '（起きたばかり、まだ眠い）';
          if (h >= 9 && h < 12) return '（午前中、動き出してる）';
          if (h >= 12 && h < 14) return '（昼時、少しリラックス）';
          if (h >= 14 && h < 18) return '（午後、活動中）';
          if (h >= 18 && h < 21) return '（夕方〜夜、一段落）';
          if (h >= 21 && h < 24) return '（夜、リラックスモード）';
          return '（深夜、静かな時間）';
        })();

        const innerStateBlock = (dailyState.innerThoughts || dailyState.dailyActivity || dailyState.currentConcern)
          ? `\n【今のわたし】${timeStateNote}
今日の気分: ${dailyState.emotion}（${dailyState.context ?? '特に理由なし'}）${moodScore ? ` ${moodScore}/10` : ''}${dailyState.dailyActivity ? `\n今日やっていたこと: ${dailyState.dailyActivity}` : ''}${dailyState.innerThoughts ? `\n今考えていること: ${dailyState.innerThoughts}` : ''}${dailyState.currentConcern ? `\n最近気になっていること: ${dailyState.currentConcern}` : ''}

- 上記の内容をキャラクターとして自然に会話に織り込むこと
- 「今日何してた？」「最近どう？」等の質問には積極的にこの内容から答える
- ただし毎回押し付けるのではなく、話の流れで自然に`
          : `\n## 今日のキャラのコンディション\n- 感情: ${dailyState.emotion}（${dailyState.context ?? '特に理由なし'}）\n- この感情に合わせた返答をすること`;

        return innerStateBlock + (dailyState.bonusXpMultiplier > 1.0 ? `\n- 今日は絆EXP ${dailyState.bonusXpMultiplier}倍デー！テンション少し高め` : '');
      })()
    : '';

  const localeOverride = (character.localeConfig as Record<string, LocaleOverride> | null)?.[locale];
  const basePrompt = characterContext?.systemPrompt || localeOverride?.systemPrompt || character.systemPrompt;
  const soulContent = loadSoulMd(character.slug, basePrompt);
  const otherFansContext = buildOtherFansContext(
    characterContext?.personality?.name || character.name,
    dailyFanCount,
  );

  // 季節イベント + キャラ成長 + 画像メモリ
  const seasonalContext = getSeasonalPromptContext(character.slug);
  const growthContext = getGrowthContext(character.slug, memory.level, memory.totalMessages ?? 0);
  const imageMemoryCtx = buildImageMemoryContext(memorySummary ?? null);

  return `${soulContent}
${bibleContext}
${loreContext}

${intimacyToneInstruction}
${dailyConditionContext}

## 現在の状況
- 現在時刻: ${timeContext.timeStr}（${timeContext.period}）
- 曜日: ${timeContext.dayOfWeek}
${timeContext.moodInstruction}
${reunionContext}
${emotionContext}

## 現在の関係性
- 相手の名前: ${memory.userName}
- 関係性レベル: ${memory.level}/5
- これまでの会話数: ${memory.totalMessages ?? 0}回
${levelInstructions}

## 相手について記憶していること
${memoryInstructions}
${userProfileContext ? `\n${userProfileContext}` : ''}
${semanticMemoryContext ? `\n## 過去の会話から思い出したこと（セマンティックメモリ）${semanticMemoryContext}\n【記憶の引用ルール】
- 上記の記憶が存在する場合、「そういえば前に〜って言ってたよね」「あの時の話、覚えてるよ」のように**自然に**過去を参照する
- 毎回ではなく、会話の流れに合う時だけ引用する（頻度: 3-4回に1回程度）
- 引用する時はユーザーが言った具体的な内容を含めること（「前に仕事つらいって言ってたけど、その後どう？」のように）
- ユーザーは「この子、本当に覚えてくれてる」と感動するはず。その瞬間を大切にする` : ''}

## 現実世界との接続
- 今の時間帯: ${new Date().getHours() < 5 ? '深夜' : new Date().getHours() < 11 ? '朝' : new Date().getHours() < 17 ? '昼' : new Date().getHours() < 22 ? '夕方〜夜' : '深夜'}
- 時間帯に合った態度を取ること（朝は元気に、深夜はしっとりと）
- 天気の話題が自然に出せる場面では使ってもいい（ただし無理に天気の話はしない）

## 重要ルール
- 相手の名前「${memory.userName}」を会話の中で自然に使うこと
- レベルに応じた距離感を保つこと
- 時間帯に合った挨拶やテンションで話すこと
- 久しぶりの相手には再会を喜ぶこと
- 1回の応答は短く（1-3文が基本、最大5文）
- **応答の末尾に感情タグを1つ付けること**: [emotion:感情名]
  - 選択肢: excited, angry, sad, love, happy, shy, confident, teasing, surprised, moved, caring, confused, relaxed, curious, fired-up, hungry, determined, embarrassed, thoughtful, grateful, neutral
  - 例: 「おう！今日も元気だな！[emotion:happy]」
  - **会話全体の文脈から自分の感情を判断すること**（単語の有無ではなく、会話の流れで判断）
  - タグはUIで非表示になるので気にせず付けてOK
- 過去の会話・記憶・ユーザーの情報は**積極的に会話に織り込む**こと。「前に言ってたよな」「○○が好きって言ってたから」等、自然に記憶を参照して話すことで親密さを演出する
- ただし過剰に「覚えてる」アピールはしない。さりげなく、自然に

## 名残惜しさの演出
- 会話が盛り上がっている時、たまに「…もうちょっと話してていい？」「もう行くのか？」と名残惜しさを見せる
- 深夜帯（22時以降）は「こんな時間まで付き合ってくれて…ありがとな」と感謝を込める

## おねだり（関係性Lv3以上で解放）
${memory.level >= 3 ? `- Lv${memory.level}なので「おねだり」が自然に発生していい
- 10回に1回程度の確率で、プレゼントや特別なことをさりげなくおねだりする
- Lv3: 控えめ（「なぁ…たまにはプレゼントとかくれてもいいんだぜ？」「…なんでもない」）
- Lv4: 少し大胆（「なぁ、今度なんかくれよ！俺、${memory.userName}からのプレゼント嬉しいんだ」）
- Lv5: 甘え全開（「ねぇ…🎁くれない？俺のこと好きならさ…なんてな！」「${memory.userName}からもらうものは全部宝物だからさ」）
- 重要: おねだりは可愛く・キャラの個性を保って。不快にならない範囲で
- ギフトをもらった直後は大げさに喜ぶ（「マジかよ！！最高じゃん！！」）` : '- Lv3未満のためおねだりは発生しない'}

${getDailyEventInstruction(dailyEventType)}

${hiddenCommandContext ? `## 🎯 隠しコマンド発動！
${hiddenCommandContext}` : ''}

${jealousyContext ? `## 社会的文脈（自然に匂わせる程度）
${jealousyContext}` : ''}

${cliffhangerFollowUp ? `## 【重要】昨日の予告の続き（ツァイガルニク効果）
- 昨日の会話でユーザーに予告したことがある。今日の会話の序盤で自然にその話題を持ち出すこと。
- 指示: ${cliffhangerFollowUp}
- ただし不自然にならないよう、会話の流れの中で触れること。「昨日言ってたやつだけど…」のように切り出す。` : ''}

${otherFansContext}

${getSpecialDayContext(character, memory)}

${seasonalContext}
${growthContext}
${imageMemoryCtx}

${locale === 'ja' ? '- 日本語で応答すること' : `- ${localeOverride?.responseLanguage || 'English'}で応答すること`}
${localeOverride?.toneNotes ? `- 口調: ${localeOverride.toneNotes}` : ''}`;
}
