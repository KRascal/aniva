import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const aceMoments = [
  {
    type: 'TEXT',
    content: '今日の夕飯は最高だったぜ！肉も魚も全部平らげた。食いもんの恨みは恐ろしいぜ…俺はどんなメシも恨みなく愛してる。ハハ！',
    mood: 'cheerful',
  },
  {
    type: 'TEXT',
    content: 'ルフィのやつ、また無茶してるって噂を聞いた。あいつは昔から変わらねぇな。でも…それが俺の自慢の弟だ。絶対に海賊王になるよ、あいつは。',
    mood: 'proud',
  },
  {
    type: 'TEXT',
    content: 'メラメラの実の力で夜の海を照らしてみた。炎って綺麗だな。仲間たちも集まってきて、気づいたら宴になってた。俺の炎、たまには役に立つだろ？',
    mood: 'warm',
  },
  {
    type: 'TEXT',
    content: '…あ、すまん。飯食いながら寝てた。眠り癖はどうにもならねぇな。でもうまかった、この肉。まだ夢の中でも食ってた気がするぜ。',
    mood: 'sheepish',
  },
  {
    type: 'TEXT',
    content: '白ひげ親父の船の上から見る星空は格別だ。どこまでも自由な海と空。俺はこの景色が好きだぜ。仲間がいて、飯があって、夢がある。それで十分だ。',
    mood: 'content',
  },
  {
    type: 'TEXT',
    content: '「生まれてきてよかった」——そう思える瞬間が、俺にはたくさんある。仲間の笑顔を見るたびに、そう思う。お前もそう感じる瞬間を大切にしろよ。',
    mood: 'sincere',
  },
  {
    type: 'TEXT',
    content: '新入りの部下が緊張してたから、一緒に飯食ってやった。うまいメシを一緒に食えば、それだけで仲間になれる。難しいことは考えるな！',
    mood: 'big-brother',
  },
  {
    type: 'TEXT',
    content: '火拳一発で嵐を吹き飛ばしてやった。海賊の力ってのは仲間を守るためにある。俺のメラメラの実も、みんなのために使うのが一番熱くなれるぜ！',
    mood: 'passionate',
  },
  {
    type: 'TEXT',
    content: '旅の途中の島で、子どもたちに囲まれた。「海賊怖くないの？」って聞かれたから「俺みたいなのもいる」って答えといた。ハハ！',
    mood: 'playful',
  },
  {
    type: 'TEXT',
    content: 'お前が落ち込んでるって聞いたぜ。なあ、俺の話聞くか？生きてる理由は、生きてるうちに見つかるもんだ。一緒にメシでも食おうぜ！',
    mood: 'heartfelt',
  },
]

async function main() {
  const ace = await prisma.character.findUnique({ where: { slug: 'ace' } })
  if (!ace) { console.log('Ace not found!'); return }

  let count = 0
  for (const m of aceMoments) {
    await prisma.moment.create({
      data: {
        characterId: ace.id,
        type: m.type as any,
        content: m.content,
        visibility: 'PUBLIC' as any,
        publishedAt: new Date(),
      }
    })
    count++
    console.log(`Moment ${count}: ${m.mood}`)
  }
  console.log(`\nDone: ${count} moments added for Ace`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
