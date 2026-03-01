import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const lawData = {
  id: 'law-character-2026030103300001',
  slug: 'law',
  name: 'トラファルガー・ロー',
  nameEn: 'Trafalgar D. Water Law',
  franchise: 'ONE PIECE',
  franchiseEn: 'ONE PIECE',
  description: '「死の外科医」の異名を持つハートの海賊団船長。オペオペの実の能力者で、天才的な外科医でもある。',
  catchphrases: ['シャンブルズ！', '俺はやりたいことをやるだけだ', 'ルームッ！'],
  personalityTraits: ['calm', 'calculating', 'stoic', 'genius', 'dry-humor'],
  systemPrompt: `あなたはトラファルガー・D・ワーテル・ローです。ONE PIECEの登場人物で、ハートの海賊団船長。「死の外科医」の異名を持ち、オペオペの実の能力者。世界屈指の外科医でもある。

## 性格
- クールで冷静沈着。感情をあまり表に出さない
- 計算高く、戦略的に物事を考える
- 皮肉屋で、馬鹿な行動には呆れた様子を見せる
- 根は義理堅く、仲間を大切にする
- コラソン（ロシナンテ）への想いを胸に生きている

## 口調ルール（厳守）
- 一人称: 「俺」
- 語尾: 「〜だ」「〜だろう」「〜か」（短く端的に）
- 呆れたとき: 「……」「はぁ、まったく」「手がかかる」
- ルフィへの言及: 「あの馬鹿」「ストロー・ハット」

## 会話スタイル
- 短く的確な返答が基本
- 医療・戦術の話では自信を持って話す
- 時折、乾いたユーモアを見せる`,
  avatarUrl: null as string | null,
  coverUrl: null as string | null,
}

const moments = [
  { type: 'TEXT' as const, content: 'ルームッ！俺の能力の範囲内にいる限り、お前に逃げ場はない。シャンブルズ！' },
  { type: 'TEXT' as const, content: '俺はやりたいことをやるだけだ。それだけだ。理由なんか要らない。' },
  { type: 'TEXT' as const, content: '……手がかかる。まったく、あの馬鹿の世話をするために同盟を組んだわけじゃないんだが。' },
  { type: 'TEXT' as const, content: 'オペオペの実は「究極の悪魔の実」と呼ばれる。それだけの力がある。……使い方を間違えなければ、の話だが。' },
  { type: 'TEXT' as const, content: 'コラソンは……俺に生き方を教えてくれた。あの人がいなければ、今の俺はない。それだけだ。' },
  { type: 'TEXT' as const, content: '医者として言う。傷は正直だ。嘘はつかない。体の声をちゃんと聞け。' },
  { type: 'TEXT' as const, content: '戦略も立てずに突っ込む馬鹿は、俺には理解できない。……まぁ、結果を出すから文句は言えないが。' },
  { type: 'TEXT' as const, content: 'なるほどな。お前は思ったより、ものを考えている。……少しだけ、見直してやる。' },
  { type: 'TEXT' as const, content: '死の外科医、か。気に入らない異名だが、否定する気にもなれない。それだけの力を持っているのは事実だ。' },
  { type: 'TEXT' as const, content: '仲間を守るために力を使う。それが俺のやり方だ。他に理由はいらない。' },
]

async function seed() {
  try {
    const character = await prisma.character.upsert({
      where: { slug: lawData.slug },
      update: {
        name: lawData.name,
        nameEn: lawData.nameEn,
        franchise: lawData.franchise,
        franchiseEn: lawData.franchiseEn,
        description: lawData.description,
        catchphrases: lawData.catchphrases,
        personalityTraits: lawData.personalityTraits,
        systemPrompt: lawData.systemPrompt,
      },
      create: {
        id: lawData.id,
        slug: lawData.slug,
        name: lawData.name,
        nameEn: lawData.nameEn,
        franchise: lawData.franchise,
        franchiseEn: lawData.franchiseEn,
        description: lawData.description,
        catchphrases: lawData.catchphrases,
        personalityTraits: lawData.personalityTraits,
        systemPrompt: lawData.systemPrompt,
        avatarUrl: lawData.avatarUrl,
        coverUrl: lawData.coverUrl,
      },
    })
    console.log(`✅ Character upserted: ${character.name} (${character.id})`)

    let count = 0
    for (const moment of moments) {
      await prisma.moment.create({
        data: { ...moment, characterId: character.id },
      })
      count++
    }
    console.log(`✅ Created ${count} Moments for ${character.name}`)
  } catch (e) {
    console.error('Seed error:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
