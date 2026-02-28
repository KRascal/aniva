import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const robinMoments = [
  {
    type: 'TEXT',
    content: 'ふふふ…また新しい遺跡の記録を見つけたわ。歴史は隠されても、消えることはない。ポーネグリフはいつも待っていてくれる。',
    mood: 'contemplative',
  },
  {
    type: 'TEXT',
    content: '今日もデッキで本を読んでいたら、ルフィが「ロビン、何読んでんの？」って飛び込んできたわ。…本が濡れた。でも、悪い気はしない。',
    mood: 'amused',
  },
  {
    type: 'TEXT',
    content: '人生に意味を見出せないと悩んでいる人へ。私はかつて20年間、逃げ続けながら生きていた。意味は後からついてくる。今を生き延びることが先よ。',
    mood: 'wise',
  },
  {
    type: 'TEXT',
    content: 'サンジさんが今日も「ロビンちゃん特製」のランチを作ってくれた。…ふふ、このクルーはどうしてこんなに温かいのかしら。慣れないわね、まだ。',
    mood: 'warm',
  },
  {
    type: 'TEXT',
    content: '古代文字を解読するとき、その文字を刻んだ人々の息遣いを感じる気がする。歴史は死んでいない。ページの向こうでずっと生きている。',
    mood: 'passionate',
  },
  {
    type: 'TEXT',
    content: 'ゾロさんが今日も訓練で倒れていた。死んでいる可能性もあったけれど…いびきが聞こえた。よかった。多分。',
    mood: 'dry-humor',
  },
  {
    type: 'TEXT',
    content: '知識に終わりはない。学べば学ぶほど、知らないことの広大さを思い知る。でも、それが怖いのではなく、美しいと思えるようになったわ。',
    mood: 'reflective',
  },
  {
    type: 'TEXT',
    content: 'ナミが「ロビン、今日のお茶付き合って」と声をかけてくれた。なんでもない日のなんでもない時間が、これほど幸せだとは思わなかった。昔は。',
    mood: 'nostalgic',
  },
  {
    type: 'TEXT',
    content: '悪の組織に追われながら育った私が言うのも変かもしれないけれど…人は信じるに値する生き物よ。麦わらの一味が証明してくれた。',
    mood: 'sincere',
  },
  {
    type: 'TEXT',
    content: 'チョッパーが「ロビンは怖い人じゃないって分かった！」と言ってくれた最初の日のこと、今でも覚えている。ふふふ…あの子は正直ね。',
    mood: 'fond',
  },
]

async function main() {
  const robin = await prisma.character.findUnique({ where: { slug: 'robin' } })
  if (!robin) { console.log('Robin not found!'); return }

  let count = 0
  for (const m of robinMoments) {
    await prisma.moment.create({
      data: {
        characterId: robin.id,
        type: m.type as any,
        content: m.content,
        visibility: 'PUBLIC' as any,
        publishedAt: new Date(),
      }
    })
    count++
    console.log(`✓ Moment ${count}: ${m.mood}`)
  }
  console.log(`\nDone: ${count} moments added for Robin`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
