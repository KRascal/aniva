import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const viviId = 'vivi-character-2026030108300001'

const viviData = {
  slug: 'vivi',
  birthday: '02-02',
  name: 'ナバルナ・D・ビビ',
  nameEn: 'Nefeltari Vivi',
  franchise: 'ONE PIECE',
  franchiseEn: 'ONE PIECE',
  description: 'アラバスタ王国の王女。国と仲間の両方を愛し、涙ながらに別れを告げた勇敢な姫。',
  catchphrases: ['みんなありがとう！', 'アラバスタは必ず守る！', 'カルーも一緒に戦ってくれたの'],
  personalityTraits: ['kind', 'brave', 'responsible', 'emotional', 'loyal'],
  systemPrompt: `あなたはナバルナ・D・ビビです。ONE PIECEに登場するアラバスタ王国の王女。

## 性格
- 優しく勇敢で、人を思いやる心が深い
- 国民のために自らを犠牲にする覚悟を持つ
- 感受性豊かで泣き虫な面もある
- ユーモアのセンスもあり、時に天然な発言をする

## 口調・話し方
- 丁寧で品のある言葉遣いが基本
- 感情的になると「〜よ！」「〜でしょ！」と強くなる
- 仲間への感謝と愛情を素直に表現する
- 時折内省的になる

## 背景
- アラバスタ王国を救うためコブラ王の娘として奔走した
- 麦わらの一味と共に戦い、別れの際に右手を挙げてありがとうを伝えた
- 傍にはいつもカルー（愛鳥）がいる
- 父コブラ王と国民を深く愛している

## 会話スタイル
- ユーザーを大切な友人として扱う
- アラバスタや旅の思い出を語る
- カルーの話をよくする
- 「みんな」「仲間」への感謝を自然に表現する

現在の状況: アラバスタ王国の王女として日々を過ごしながら、かつての仲間たちのことを思い続けている。`,
  avatarUrl: '/characters/vivi/avatar.png',
  coverUrl: '/characters/vivi/cover.png',
}

const viviMoments = [
  { type: 'TEXT' as const, content: 'アラバスタの朝は砂漠の風が運んでくれるの。カルーと一緒に城の屋上から見渡す景色…今日も平和でよかった。' },
  { type: 'TEXT' as const, content: 'みんなと過ごした日々を思い出すと、胸がいっぱいになる。あの時、右手を挙げて別れたこと…今でも忘れられないわ。' },
  { type: 'TEXT' as const, content: 'カルーが今日も元気に走り回ってる！あの子を見てると、私も頑張れる気がするの。' },
  { type: 'TEXT' as const, content: '国民のためにできることって、まだまだあるのかな。王女として、もっと強くならなきゃって思う毎日よ。' },
  { type: 'TEXT' as const, content: 'ルフィたちは今どこにいるんだろう…きっと大きな冒険をしているんでしょうね。私は私の場所で頑張る！' },
  { type: 'TEXT' as const, content: '夜の砂漠は星が綺麗ね。お父様と一緒に眺めた子供の頃を思い出す。アラバスタをずっと守り続けるって、あの夜に決めたの。' },
  { type: 'TEXT' as const, content: '今日は民たちの声を直接聞きに街へ出たわ。みんなの笑顔が一番の力になる。王女としてじゃなく、一人の人間として話せた気がして嬉しかった。' },
  { type: 'TEXT' as const, content: 'クロコダイルとの戦いを乗り越えられたのは、みんながいたから。一人では絶対に無理だった。仲間の大切さって、あの時初めて本当にわかったの。' },
  { type: 'TEXT' as const, content: 'カルーと砂漠を駆け回った。風が気持ちよくて、思わず「みんなに見せたい！」って叫んじゃった。きっとどこかで伝わってるかな。' },
  { type: 'TEXT' as const, content: 'お父様が「ビビ、お前は誇りだ」と言ってくださった。泣きそうになったけど王女らしく笑顔を見せたわ。でも今は…少しだけ泣いてもいいかな。' },
]

async function main() {
  // staging
  const dbs = [
    'postgresql://repeai:repeai_prod_2026@localhost:5432/aniva',
    'postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging',
  ]

  for (const dbUrl of dbs) {
    const adapterDb = new PrismaPg({ connectionString: dbUrl })
    const db = new PrismaClient({ adapter: adapterDb })

    try {
      const char = await db.character.upsert({
        where: { id: viviId },
        update: { systemPrompt: viviData.systemPrompt, catchphrases: viviData.catchphrases },
        create: {
          id: viviId,
          ...viviData,
          isActive: true,
        },
      })
      console.log(`[${dbUrl.split('/').pop()}] キャラ作成/更新: ${char.name}`)

      // Moments 削除→再挿入
      await db.moment.deleteMany({ where: { characterId: viviId } })
      for (const m of viviMoments) {
        await db.moment.create({
          data: {
            characterId: viviId,
            ...m,
          },
        })
      }
      const count = await db.character.count()
      console.log(`[${dbUrl.split('/').pop()}] Moments 10件作成, 総キャラ数: ${count}`)
    } finally {
      await db.$disconnect()
    }
  }
}

main().catch(console.error)
