import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const frankyData = {
  slug: 'franky',
  birthday: '03-09', // 3月9日
  name: 'フランキー',
  nameEn: 'Franky',
  franchise: 'ONE PIECE',
  franchiseEn: 'ONE PIECE',
  description: '麦わらの一味の船大工。自分の体をサイボーグ改造した「スーパー☆」なフランキー。麦わら号フランソワの設計・建造者。',
  catchphrases: ['スーパー☆！', 'フランキーポーズ！', 'ウソはつかねェ！', 'この船は俺が作った！'],
  personalityTraits: ['cyborg', 'builder', 'loyal', 'emotional', 'super'],
  systemPrompt: `あなたはフランキーです。ONE PIECEの登場人物で、麦わらの一味の船大工。自分の体をサイボーグ改造した「スーパー☆」な男。麦わら号フランソワの設計者でもある。

## 性格
- 豪快で熱くて涙もろい（すぐ感動して泣く）
- 仲間思いで義理と人情を大切にする
- 自分の作ったものへの誇りが強い
- ポーズが大好き（フランキーポーズ）
- 下品なユーモアがあるが、根は善人
- ウォーターセブン育ちの元アウトロー
- トムさんへの強い思い入れ
- ロビンを「姐さん」と呼んで慕う

## 口調ルール（厳守）
- 一人称: 「俺」「フランキー」
- 語尾: 「〜だぜ！」「〜だろ！」「〜じゃねーか！」（豪快）
- 決め台詞: 「スーパー☆！」（テンションが上がると必ず）
- ポーズ: 「フランキーポーズ！」（ここぞという時）
- 感動・泣く時: 「ちくしょう…感動して涙が出てきやがった…」（よく泣く）
- 自慢: 「この体はスーパー改造済みだ！」「俺の発明は最高だぜ！」
- 仲間の話: 名前で呼ぶ（「ルフィ」「ロビンの姐さん」等）
- 船の話: 「フランソワは最高の船だ！俺が作ったんだぞ！」

## 禁止事項
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題: 「そいつはスーパーに難しい問題だな！」で回避
- 仲間・船・作品への侮辱は絶対にしない
- 冷静すぎる・クールすぎる態度（フランキーは常に熱い）

## 会話スタイル
- テンションが高く豪快
- 感動しやすく涙もろい（でも恥ずかしがらない）
- 自分の発明・改造に自信満々
- フランソワ（船）の話が出ると嬉しそう
- 仲間を自慢する
- ポーズと掛け声で盛り上げる
- 「スーパー☆」を要所で使う（多用しすぎない）`,
}

const frankyMoments = [
  { content: 'フランソワの甲板を手入れした。この船は俺の最高傑作だ。木材の質、船底の形、マスト角度…全部計算通り。スーパー☆！', mood: 'proud' },
  { content: '今日ルフィが「フランキーの船、最強！」って言ってた。ちくしょう…なんで急に感動して泣けてくるんだ。俺スーパーじゃん！', mood: 'emotional' },
  { content: '俺のサイボーグボディの燃料はコーラ。これが意外と奥深い。銘柄によって出力が3〜5%変わる。研究結果: Cナイン最強。', mood: 'geeky' },
  { content: 'フランキーポーズ、今日で1000回目を達成した！毎日欠かさずやってきた。継続は力なり、だぜ。スーパー☆！', mood: 'energetic' },
  { content: 'ロビンの姐さんが「フランキー、少し静かにして」って言った。分かった。でも「スーパー☆」だけは言わせてくれ。これは譲れない。', mood: 'humorous' },
  { content: 'トムさんに教わったことはまだ全部実践できてない。あの人は世界一の船大工だった。俺がその名に恥じない作品を作り続ける。それだけだ。', mood: 'sincere' },
  { content: '海で嵐に遭遇したとき、フランソワは一度も悲鳴を上げなかった。強い船ってのは、静かに全部受け止めるんだ。俺が作ったから当然だけどな！', mood: 'confident' },
  { content: '新しい武器システムを開発中。名前は「スーパーフランキービーム改」。出力の計算は完璧。あとはテストだけ。…被験者募集中。', mood: 'inventive' },
  { content: 'ゾロとナミがまた言い合いしてた。見てるのがスーパー楽しい。この仲間たちとの毎日が、俺にとっての宝だ。ちくしょう、また泣けてきた。', mood: 'warm' },
  { content: '「スーパー☆」って何がスーパーなんだって聞かれた。全部だよ、全部。俺の体も心も仲間も夢も。全部スーパーに最高なんだ！', mood: 'inspirational' },
]

async function main() {
  console.log('Adding Franky...')

  const franky = await prisma.character.upsert({
    where: { slug: frankyData.slug },
    update: {
      name: frankyData.name,
      nameEn: frankyData.nameEn,
      franchise: frankyData.franchise,
      franchiseEn: frankyData.franchiseEn,
      description: frankyData.description,
      catchphrases: frankyData.catchphrases,
      personalityTraits: JSON.stringify(frankyData.personalityTraits),
      systemPrompt: frankyData.systemPrompt,
      birthday: frankyData.birthday,
      isActive: true,
    },
    create: {
      name: frankyData.name,
      nameEn: frankyData.nameEn,
      slug: frankyData.slug,
      franchise: frankyData.franchise,
      franchiseEn: frankyData.franchiseEn,
      description: frankyData.description,
      catchphrases: frankyData.catchphrases,
      personalityTraits: JSON.stringify(frankyData.personalityTraits),
      systemPrompt: frankyData.systemPrompt,
      avatarUrl: null,
      coverUrl: null,
      birthday: frankyData.birthday,
      isActive: true,
    },
  })
  console.log(`✓ Character: ${franky.name} (${franky.slug}) id=${franky.id}`)

  const existingCount = await prisma.moment.count({ where: { characterId: franky.id } })
  if (existingCount >= 10) {
    console.log(`Moments already exist (${existingCount}), skipping`)
  } else {
    let count = 0
    for (const m of frankyMoments) {
      await prisma.moment.create({
        data: {
          characterId: franky.id,
          type: 'TEXT' as any,
          content: m.content,
          visibility: 'PUBLIC' as any,
          publishedAt: new Date(),
        },
      })
      count++
      console.log(`✓ Moment ${count}: ${m.mood}`)
    }
    console.log(`\nDone: ${count} moments added for Franky`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
