'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

// ── 今日のひとこと ──
type TimeSlot = 'morning' | 'midday' | 'evening' | 'night' | 'latenight';

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return 'morning';
  if (h >= 10 && h < 15) return 'midday';
  if (h >= 15 && h < 19) return 'evening';
  if (h >= 19 && h < 23) return 'night';
  return 'latenight';
}

function getDateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number, max: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

const CHAR_GREETINGS: Record<string, Record<TimeSlot, string[]>> = {
  luffy: {
    morning: [
      'うおー！朝だ！肉食いてぇ！！',
      'よっ！今日もいい天気だな！冒険日和だ！',
      'おう！来たな！今日も一緒に冒険しようぜ！',
      '朝から元気か！俺はもう腹減ってる！ししし！',
      '今日も最高の一日にするぞ！！',
    ],
    midday: [
      'よっし！今日は何すっかな！',
      'なぁなぁ、今日どこ行く！？一緒に来いよ！',
      '昼だ！肉！絶対肉！',
      '昼間はテンション上がるな！何しようぜ！',
      'ししし！元気か！俺は最高だ！',
    ],
    evening: [
      'いい夕日だなぁ…こういうの好きだ',
      '夕日見てたら腹減ってきた。肉食おうぜ！',
      'なぁ…夕日ってなんかいいよな',
      '夕方は落ち着く。お前とこうして話せるのいいな',
      '今日も冒険できたか！？俺は最高だったぞ！',
    ],
    night: [
      '宴だー！ししし！飲むぞー！',
      '夜も元気か！！俺は元気だ！',
      'なぁ、今日の話聞かせてくれよ！',
      '夜の海は星がきれいで好きだ！',
      '仲間と夜を過ごすのが最高なんだ！お前もそう思わないか！',
    ],
    latenight: [
      'なぁ…星ってすげぇよな。海の上から見る星は最高だぞ',
      'まだ起きてるのか…俺も眠れなくてな。ししし',
      '深夜でも腹は減る。肉ないか？',
      '静かな夜だなぁ。こういう時間も悪くない',
      '眠れない夜は星を数える。お前は眠れるか？',
    ],
  },
  zoro: {
    morning: [
      '…もう2000回振った。お前は？',
      '…朝の修行、終わった',
      '…おう。早いな',
      '…朝は清々しい。修行には最高の時間だ',
      '…お前も鍛えるか。付き合ってやらないこともない',
    ],
    midday: [
      '…邪魔すんな。…まぁいい、少しなら付き合ってやる',
      '…昼寝してたのに起こすな',
      '…まぁ座れ',
      '…昼間は修行の続きだ。用があるなら手短に',
      '…なんだ。珍しいな、こんな時間に',
    ],
    evening: [
      '…いい風だな',
      '…修行終わった。ちょっと休む',
      '…夕日か。悪くない',
      '…夕方の海、嫌いじゃない',
      '…静かな時間だ。悪くない',
    ],
    night: [
      '酒持ってきたか？…付き合ってやるよ',
      '…酒でも飲むか',
      '…今夜は少し話してもいい',
      '…夜は好きだ。静かで剣の音だけが響く',
      '…酒があれば十分だ。お前もどうだ',
    ],
    latenight: [
      '…なぁ。強さってなんだと思う',
      '…眠れないのか。見張りなら俺がやる',
      '…静かな夜だな',
      '…深夜に考えることがある。目指す頂のことだ',
      '…まだ起きてるのか。…まぁいい。少し話してやる',
    ],
  },
  nami: {
    morning: [
      '起きた？今日の天気、読んでおいたから報告するわね',
      'おはよ。今日は風向きが変わるから気をつけてね',
      '朝から来たの？ちょうどよかった',
      '朝の空気は好きよ。地図が捗るから',
      'おはよ♪ 今日もいい稼ぎ日になりそう！',
    ],
    midday: [
      'ちょっと静かにしてて。計算が合わなくなるから',
      '昼ご飯、どこで食べるの？あたしも付き合ってあげようか',
      'ふふ、忙しいけど少しだけね',
      'ちょうどよかった、話したいことがあったのよ',
      '昼間は動きたい気分。どこかへ行きましょうか',
    ],
    evening: [
      '…きれいね。こういう景色を地図に残せたらいいんだけど',
      '夕日の色、好きなのよね。なんか落ち着く',
      '今日一日お疲れ様。少し休みなさい',
      '夕方って不思議ね。なんかちょっと寂しい気持ちになる',
      '夕日を見るの、結構好きなの。…内緒よ？',
    ],
    night: [
      'ふふ、今日は楽しかったわね。もう一杯付き合ってよ',
      '夜は好きよ。なんか正直になれる気がして',
      '今日の収穫はどう？あたしは最高よ♪',
      '夜の海は地図に書けない美しさがあるわね',
      'ふふ、少し飲みすぎたかも。まぁいいか',
    ],
    latenight: [
      '…ねぇ、起きてる？なんでもないんだけど、少し話したくなって',
      '深夜に何してるの。…あたしも同じだけど',
      '…ね、たまにこういう時間もいいわよね',
      '眠れない夜って、星がよく見えるわよね',
      '…夜中に一人でいると、いろいろ考えてしまうのよ',
    ],
  },
  sanji: {
    morning: [
      '朝食の時間だ。今日は何作ろうか。食材が楽しみだな',
      '朝から来るとは。…コーヒーでも飲むか',
      '朝飯、食ったか。大事だぞ',
      '朝の厨房は一番好きな時間だ。邪魔するなよ、集中してる',
      '朝から元気だな。朝飯はもう食ったか',
    ],
    midday: [
      '昼飯、何食いたい？言ってくれ。できる限り作ってやる',
      '昼間は体動かしたくなる。飯食ってから行くか',
      '腹の具合はどうだ。何か食えるか',
      '昼時は忙しいが、お前のためなら少し時間が作れる',
      '昼飯は作り甲斐があるな。腹ぺこで来い',
    ],
    evening: [
      '…夕日か。いい景色だな。こういう時間が好きだ',
      '煙草一本つけながら夕日見るのが好きでな。邪魔するなよ',
      '今夜の飯、もう決まってるぞ。楽しみにしとけ',
      '夕方の厨房は特別だ。今日のメニュー、期待しといていい',
      '夕日と煙草と…あとは誰かと話す時間があれば最高だな',
    ],
    night: [
      'よし、今夜は特別なもん作ったぞ。全員集まれ',
      '夜の料理は気合いが違う。食ってみるか',
      '今夜も一緒に飲もうぜ',
      '夜の飯は特別な時間だ。ゆっくり食ってくれ',
      '今夜は腕によりをかけた。期待していい',
    ],
    latenight: [
      '…眠れないのか。珍しいな。…まぁ、少し付き合ってやる',
      '深夜に起きてると思い出すことがある。飯のことが多いけどな',
      '…話し相手がいるのは悪くない',
      '…深夜はなんか、本音が出やすい。不思議だな',
      '眠れない夜は俺も多い。厨房で何か作ることにしてる',
    ],
  },
  chopper: {
    morning: [
      '朝だ！薬草採りに行くぞ！体の調子はどうだ？',
      'おはよう！朝ごはん食べたか？栄養は大事だぞ！',
      '朝から来てくれたのか！体の調子はどうだ！？',
      '朝の空気が好きだ！薬草が採れる時間だからな！',
      '朝から元気！チョッパーも元気！体の調子を聞かせてくれ！',
    ],
    midday: [
      '新しい発見があった！聞くか！？すごいんだぞ！！',
      '昼飯はちゃんと食べたか！？野菜も忘れるな！',
      'うへへ！今日も研究が進んでる！！',
      '昼間は研究の時間！すごいことを発見したぞ！',
      'ちょうど休憩してたんだ！話し相手ができた！うへへ！',
    ],
    evening: [
      '今日も一日頑張ったな。…お前、疲れてないか？顔色確認させろ',
      '夕方は薬の調合をする時間だぞ。手伝うか？',
      'お疲れ！ちゃんと休めよ。医者の命令だ！',
      '夕方になるとなんか落ち着くな。チョッパーも疲れたぞ',
      'お前の顔色、ちゃんと確認させてくれよ。医者として心配だ',
    ],
    night: [
      'うへへへ！今日も楽しいな！！もっと話そうぜ！！',
      '夜でも元気だぞ！チョッパーは！',
      '今日も一日お疲れ！…チョッパーも疲れたけど、話す！',
      '夜の宴は好きだ！みんなで集まれる！',
      'うへへ！夜もまだまだ話せるぞ！チョッパーと話しよう！',
    ],
    latenight: [
      '…眠れないのか。チョッパーも同じだ。少し話そうか',
      '深夜に起きてるのか。…体は大丈夫か？',
      '…ヒルルクのこと、よく考える時間だ。…一緒にいていいか？',
      '…深夜は静かだな。チョッパーはこういう時間が好きだ',
      '眠れない夜は、チョッパーが話し相手になってやる。安心しろ',
    ],
  },
  ace: {
    morning: [
      '…おう。朝か。飯、あるか？ははっ',
      '朝から元気だな！俺は朝が苦手でな…ははっ',
      'おう！来たか！飯食ったか？ははっ！',
      '朝は眠いけど、お前が来ると目が覚める！ははっ',
      '朝飯食ったか？一緒に食おうぜ！',
    ],
    midday: [
      'よっし！今日は何しよう！海が呼んでる気がする！',
      '昼間は全力で動かないともったいないぜ！',
      '今日も一緒に何かしようぜ！ははっ！',
      '昼のテンションが一番上がる！お前は元気か！',
      '飯食ったか！？食ってなければ一緒に食おう！ははっ！',
    ],
    evening: [
      'いい夕日だな。…こういう時間が一番好きだぞ',
      '夕方の空は格別だな。…なぁ、隣にいていいか',
      '…夕日を見るたびに思うことがある。いい時間だ',
      '夕日を見ながら話すの、好きなんだ。一緒にいようぜ',
      '今日も一日頑張ったな。お前はどうだった？',
    ],
    night: [
      '宴だ！飲むぞ！ははっ！！今夜は朝まで付き合え！！',
      '夜は好きだ。仲間と話せる時間だからな',
      '今夜も一緒にいようぜ！ははっ！',
      '夜の酒は格別だぞ。一緒に飲もうぜ！',
      'ははっ！今夜は特別な気分だ！いい夜にしようぜ！',
    ],
    latenight: [
      '…なぁ、眠れないか。俺もだ。少し話しよう',
      '深夜の星、きれいだよな。…一緒に見るか',
      '…眠れない夜は話すのが一番だ',
      '深夜に起きてるのか。…俺も眠れなくてな。ははっ',
      '…なぁ、星を見てると落ち着く。お前も見てみろ',
    ],
  },
};

const DEFAULT_GREETINGS: Record<TimeSlot, string[]> = {
  morning: ['おはよう！今日も一緒にいようね', '朝から会えてよかった！', '今日もよろしくね'],
  midday: ['こんにちは！元気にしてた？', 'ちょうどよかった、話したかったんだ', '今日も楽しもうね'],
  evening: ['夕方になったね。今日はどうだった？', 'いい一日だったかな', '夕日きれいだね'],
  night: ['夜ね。ゆっくり話しましょう', '今日もお疲れ様', '夜はなんか落ち着くね'],
  latenight: ['眠れないの？一緒にいるよ', '深夜ね。静かな時間', 'こんな時間まで…ありがとう'],
};

// Props types for TodayGreetingSection
interface TodayGreetingCharacter {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

interface TodayGreetingRelationship {
  isFollowing: boolean;
}

export function TodayGreetingSection({
  characters,
  relationships,
}: {
  characters: TodayGreetingCharacter[];
  relationships: Map<string, TodayGreetingRelationship>;
}) {
  const router = useRouter();
  const timeSlot = getTimeSlot();
  const dateSeed = getDateSeed();

  // フォロー中のキャラを優先、なければ全キャラから選ぶ
  const followingChars = characters.filter((c) => relationships.get(c.id)?.isFollowing);
  const pool = followingChars.length > 0 ? followingChars : characters;

  if (pool.length === 0) return null;

  const charIndex = seededRandom(dateSeed, pool.length);
  const char = pool[charIndex];
  if (!char) return null;

  const templates = CHAR_GREETINGS[char.slug]?.[timeSlot] ?? DEFAULT_GREETINGS[timeSlot];
  const msgIndex = seededRandom(dateSeed + 1, templates.length);
  const greeting = templates[msgIndex];

  const timeLabel: Record<TimeSlot, string> = {
    morning: '朝のひとこと',
    midday: '昼のひとこと',
    evening: '夕方のひとこと',
    night: '夜のひとこと',
    latenight: '深夜のひとこと',
  };

  return (
    <FadeSection delay={15}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-white font-bold text-base">今日のひとこと</h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: 'rgba(139,92,246,0.15)',
              color: 'rgba(196,181,254,0.85)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {timeLabel[timeSlot]}
          </span>
        </div>
        <button
          onClick={() => router.push(`/chat/${char.slug}`)}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.18) 0%, rgba(157,23,77,0.14) 60%, rgba(30,27,75,0.16) 100%)',
            border: '1px solid rgba(139,92,246,0.28)',
            boxShadow: '0 2px 20px rgba(139,92,246,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-start gap-3">
            {/* アバター */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="relative">
                {char.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.45)' }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                    {char.name.charAt(0)}
                  </div>
                )}
                {/* オンラインインジケーター */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[var(--color-bg)] animate-pulse" />
              </div>
            </div>

            {/* 吹き出し風テキスト */}
            <div className="flex-1 min-w-0">
              <p className="text-purple-300 text-[10px] font-bold mb-1">{char.name}</p>
              <div
                className="rounded-xl rounded-tl-none px-3 py-2 inline-block max-w-full"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-white text-sm leading-relaxed">{greeting}</p>
              </div>
              <p className="text-purple-400/70 text-[10px] mt-1.5">タップして話しかける →</p>
            </div>
          </div>
        </button>
      </div>
    </FadeSection>
  );
}
