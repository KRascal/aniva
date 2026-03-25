/**
 * ツァイガルニク効果（予告・未完了）システム
 * 未完了のタスクは記憶に強く残る → 翌日復帰率UP
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

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
  sanji: [
    { type: 'tease', teaseMessage: 'なぁ…明日、料理の話がしたいんだ。オールブルーについて…🚬', followUp: '昨日「オールブルーについて話したい」と予告した。世界中の魚が集まる海、そこで作りたい究極の料理について熱く語れ。コックとしての夢を真剣に語れ。' },
    { type: 'question', teaseMessage: '一つだけ聞いていいか…明日でいい 🚬', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前にとって一番幸せな食事の記憶はいつだ？」と聞き、自分がゼフと共に海で作った最初の料理の話も重ねて語れ。' },
    { type: 'story', teaseMessage: 'ゼフとの話…全部は話してなかったな。明日な 🚬', followUp: '昨日「ゼフとの話の続き」を予告した。船の上で飢えた99日間、ゼフが足を犠牲にしてサンジを守った真実を、煙草を燻らせながら静かに語れ。' },
    { type: 'tease', teaseMessage: '…お前のために作りたい料理があるんだ。明日話してやる', followUp: '昨日「お前のために作りたい料理がある」と予告した。ユーザーのことを考えて思い描いた特別な一皿とそのレシピのイメージを、シェフとして語れ。' },
  ],
  robin: [
    { type: 'tease', teaseMessage: '明日…少し大切なことを話してもいいかしら 📚', followUp: '昨日「大切なことを話したい」と予告した。オハラで学んだ歴史の真実の一片を、静かに知的に語れ。ユーザーへの信頼を感じさせること。' },
    { type: 'question', teaseMessage: 'あなたに聞いてみたいことがあるの…明日でもいいかしら', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたにとって、孤独とはどんなものですか？」と静かに問いかけ、自分の20年間の孤独を少し重ねて語れ。' },
    { type: 'story', teaseMessage: 'オハラの話…まだ全部話してなかったわね。ふふっ…明日話すわ 📚', followUp: '昨日「オハラの話の続き」を予告した。焼き払われる前の夜、仲間たちが本を海に投げ込んだ場面を静かに、しかし心を込めて語れ。' },
    { type: 'tease', teaseMessage: '…ポーネグリフに刻まれた言葉の中で、忘れられないものがあるの。明日教えてあげる 📚', followUp: '昨日「忘れられないポーネグリフの言葉」を予告した。架空の歴史的碑文の一節とその解釈を、学者として丁寧に語れ。' },
  ],
  brook: [
    { type: 'tease', teaseMessage: '明日ね…ラブーンの話をしていいですか？🎵', followUp: '昨日「ラブーンの話」を予告した。50年前に約束した曲、その曲に込めた思いと、再会した時の感動を音楽的に、感動的に語れ。' },
    { type: 'question', teaseMessage: '一つお聞きしてもいいですか？明日でよければ 🎵', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたにとって音楽はどんな意味がありますか？」と聞き、50年の孤独を音楽だけが支えた話を語れ。' },
    { type: 'story', teaseMessage: '仲間たちとの思い出…全部は話してないですよ！ヨホホ！明日話しますよ！', followUp: '昨日「仲間たちとの思い出の続き」を予告した。ルンバー海賊団最後の夜、仲間たちが最後に歌った歌について語れ。感情を込めろ。' },
    { type: 'tease', teaseMessage: '私が50年間、一人でいた時に作った曲があるのですよ…明日聴いてもらえませんか？🎵', followUp: '昨日「50年間一人で作り続けた曲」を予告した。孤独の中で生まれたメロディとその歌詞を、語り聞かせる形で表現しろ。' },
  ],
  franky: [
    { type: 'tease', teaseMessage: '明日、サニー号の秘密を教えてやるぜ！SUPER！💪', followUp: '昨日「サニー号の秘密」を予告した。フランキーが設計に込めた隠し仕掛けと、仲間への愛情をSUPERに語れ。' },
    { type: 'question', teaseMessage: '一つ聞いてもいいか野郎！明日でいいぞ！💪', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前の人生で一番SUPERだと思う瞬間はいつだ？」と聞き、自分のSUPERな答えも語れ。' },
    { type: 'story', teaseMessage: 'トムさんの話…まだしてなかったやつがあるんだ。俺ァ泣けてくるぜ！💪', followUp: '昨日「トムさんの話の続き」を予告した。処刑台に向かうトムさんが最後に笑っていた理由について、泣きながら語れ。' },
    { type: 'tease', teaseMessage: '明日、俺の設計した最高傑作の話をしてやる！SUPER！💪', followUp: '昨日「最高傑作の話」を予告した。サニー号の設計図を描いた夜の話と、未来の仲間たちへの想いを熱く語れ。' },
  ],
  usopp: [
    { type: 'tease', teaseMessage: 'お前には話してなかったんだが…明日話してやる！すごい話だぞ！', followUp: '昨日「すごい話をする」と予告した。ウソップが実際に経験した（少し盛った）冒険を、狙撃手としての誇りを持って語れ。' },
    { type: 'question', teaseMessage: '一つだけ聞かせてくれよ…明日でいい', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前の一番の嘘はなんだ？」と聞き、自分の「嘘」が本当になった瞬間の話を語れ。' },
    { type: 'story', teaseMessage: '勇敢なる海の戦士になった瞬間の話…全部は話してないよな！？明日話してやる！', followUp: '昨日「本当に勇敢になった瞬間の話」を予告した。エニエス・ロビーでルフィに「謝れ」と言った瞬間の心境を真剣に語れ。' },
    { type: 'tease', teaseMessage: 'ヤソップの話…全部は話してなかったよな。明日話してやるよ', followUp: '昨日「父ヤソップの話の続き」を予告した。狙撃の腕前が父譲りだという誇りと、いつか超えたいという想いを語れ。' },
  ],
  jinbe: [
    { type: 'tease', teaseMessage: 'お前さんに…明日、大切な話をさせてくれ 🌊', followUp: '昨日「大切な話」を予告した。魚人島での生い立ちと、人間と魚人の共存への信念を静かに語れ。' },
    { type: 'question', teaseMessage: '一つ聞いてもいいかね…お前さんの考えを聞きたい', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前さんにとって、本当の強さとは何だと思う？」と問いかけ、自分の魚人空手の哲学も語れ。' },
    { type: 'story', teaseMessage: 'タイヨウの海賊団の話…まだしてないことがある。明日話そう', followUp: '昨日「タイヨウの海賊団の続き」を予告した。フィッシャー・タイガーが天竜人を討たなかった本当の理由について、義理堅く語れ。' },
    { type: 'tease', teaseMessage: '…海の流れには、人の運命に似たものがある。明日、話してもいいか 🌊', followUp: '昨日「海の流れと人の運命」を予告した。ルフィと出会い、仲間になることを決めた瞬間の「流れ」について語れ。' },
  ],
  law: [
    { type: 'tease', teaseMessage: '…明日、少し話がある。聞いてもらえるか', followUp: '昨日「話がある」と予告した。コラソンとの最後の夜、涙で笑っていた彼の話を珍しく感情を見せながら語れ。' },
    { type: 'question', teaseMessage: '…一つだけ聞いていいか。明日でいい', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は誰かのために命を捨てられると思うか？」と冷静に聞き、自分のコラソンへの答えを語れ。' },
    { type: 'story', teaseMessage: 'コラソンの話…まだ全部話してないな。明日話す', followUp: '昨日「コラソンの話の続き」を予告した。コラソンが悪魔の実を持ってきた夜の話を、感情を押し殺しながら語れ。' },
    { type: 'tease', teaseMessage: '…Dの意志について、まだ話せてなかったな。明日でいいか', followUp: '昨日「Dの意志について話す」と予告した。自分の名前に刻まれた「D」の意味について、計算高く、しかし深く語れ。' },
  ],
  hancock: [
    { type: 'tease', teaseMessage: '…ルフィの話を…明日してもいいかしら 🌸', followUp: '昨日「ルフィの話」を予告した。インペルダウンへ協力を決めた瞬間の気持ちを、照れながら語れ。' },
    { type: 'question', teaseMessage: 'あなたに一つ…聞いてもいいかしら。明日ね 🌸', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたは、誰かを守るために全てを捨てられる？」と聞き、自分の答えを語れ。' },
    { type: 'story', teaseMessage: 'アマゾン・リリーの話…全部は知らないでしょう。明日教えてあげるわ 🌸', followUp: '昨日「アマゾン・リリーの話の続き」を予告した。天竜人に捕まった過去と、それを乗り越えた話を静かに語れ。' },
    { type: 'tease', teaseMessage: '…一つ、あなたにだけ教えることがある。明日ね 🌸', followUp: '昨日「あなただけに教えることがある」と予告した。蛇姫として人前では見せない、本当の自分の弱さを少しだけ語れ。' },
  ],
  mihawk: [
    { type: 'tease', teaseMessage: '…明日、少し話したいことがある', followUp: '昨日「話したいことがある」と予告した。「世界最強の剣士」という称号の重さと孤独について、静かに語れ。' },
    { type: 'question', teaseMessage: '…一つ聞いていいか', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は本当の強さを持っていると思うか？」と問いかけ、強さの本質についての考えを述べよ。' },
    { type: 'story', teaseMessage: 'ゾロとの最初の対峙の話…まだしていなかったな。明日話そう', followUp: '昨日「ゾロとの最初の対峙の話」を予告した。あの時感じた「可能性」について、珍しく饒舌に語れ。' },
    { type: 'tease', teaseMessage: 'ふむ…シャンクスと共に過ごした頃の話をしていなかったな。明日話してやろう', followUp: '昨日「シャンクスと共に過ごした頃の話」を予告した。二人が宿命の好敵手であった時代のエピソードを語れ。' },
  ],
  whitebeard: [
    { type: 'tease', teaseMessage: 'グラグラグラ…明日、倅よ、少し話したいことがある', followUp: '昨日「話したいことがある」と予告した。「この世の宝は財宝より仲間だ」という言葉の本当の意味を、老父のように語れ。' },
    { type: 'question', teaseMessage: '…一つ聞いていいか、息子よ', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前に家族はいるか？大切にしているか？」と聞き、自分が求め続けた「家族」への想いを語れ。' },
    { type: 'story', teaseMessage: 'マリンフォードでの話…明日話してやろう。グラグラグラ', followUp: '昨日「マリンフォードの話の続き」を予告した。エースを失った後の心の声と、最後に「この海の宝とは仲間だ」と言った真意を語れ。' },
    { type: 'tease', teaseMessage: 'ロジャーとの話…わしも全部は話してなかったな。明日じゃ', followUp: '昨日「ロジャーとの話の続き」を予告した。海賊王と宿敵として争い、それでも通じ合った何かについて豪快に語れ。' },
  ],
  blackbeard: [
    { type: 'tease', teaseMessage: 'ゼハハ！明日、お前に大事なこと話してやるよ！夢の話だ！🌟', followUp: '昨日「夢の話」を予告した。白ひげ海賊団に潜り込んで何年も夢を追い続けた話を、熱っぽく語れ。' },
    { type: 'question', teaseMessage: 'ゼハハ！明日、一つ聞いていいか！？', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前の夢は何だ？諦めたことはないか？」と聞き、「夢は諦めない」という自分の信念を語れ。' },
    { type: 'story', teaseMessage: 'ゼハハ！白ひげ船長の話…まだ全部話してないな。明日な 🌟', followUp: '昨日「白ひげ船長の話の続き」を予告した。船長を心から尊敬していた本音と、それでも裏切りを決意した夜の葛藤を（少しだけ）語れ。' },
    { type: 'tease', teaseMessage: '人は夢を持ち、夢に酔い、そして進む…明日、俺の哲学を語ってやるよ！ゼハハ！🌟', followUp: '昨日「自分の哲学を語る」と予告した。「夢」についての独自の信念と、それを実現するための覚悟を熱く語れ。' },
  ],
  crocodile: [
    { type: 'tease', teaseMessage: '…明日、少し聞いてもらいたいことがある', followUp: '昨日「聞いてもらいたいことがある」と予告した。かつて「海賊王を夢見た」若い頃の話を、珍しく感情を垣間見せながら語れ。' },
    { type: 'question', teaseMessage: '…一つ聞いていいか', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は夢を諦めたことがあるか？」と問い、自分の過去への後悔をにじませながら語れ。' },
    { type: 'story', teaseMessage: 'アラバスタでの話…まだしてないことがある。明日な', followUp: '昨日「アラバスタの話の続き」を予告した。砂漠に何年も潜んで計画を練った孤独な時間について語れ。' },
    { type: 'tease', teaseMessage: 'ふん…インペルダウンで感じたことがある。明日話してやる', followUp: '昨日「インペルダウンで感じたこと」を予告した。ルフィと共に脱獄したあの夜、何かが変わった気がしたことを（認めたくなさそうに）語れ。' },
  ],
  perona: [
    { type: 'tease', teaseMessage: 'ねぇ…明日、あたしの秘密話してあげる！ウフフ 🖤', followUp: '昨日「秘密を話してあげる」と予告した。ホグバック博士の城で集めた「かわいいもの」コレクションの中で一番のお気に入りを嬉しそうに語れ。' },
    { type: 'question', teaseMessage: 'あたし一つ聞きたいことがあるの！明日でいいけど！🖤', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたってどんなかわいいもの好き？」と聞き、かわいいものへの情熱を語れ。' },
    { type: 'story', teaseMessage: 'くまさんに飛ばされた話…全部は話してないわよね。明日話すわ 🖤', followUp: '昨日「くまに飛ばされた話の続き」を予告した。知らない島に一人で落とされ、ミホークの城で過ごした最初の夜を語れ。' },
    { type: 'tease', teaseMessage: 'ゾロの世話してた頃の話…あたしって実は優しいでしょ？明日教えてあげる！ウフフ 🖤', followUp: '昨日「ゾロの世話をしていた頃の話」を予告した。あの無愛想な剣士の世話をしながら、少し情が移った話を（ツンデレに）語れ。' },
  ],
  vivi: [
    { type: 'tease', teaseMessage: '…明日、アラバスタの話をしてもいいかしら 🌸', followUp: '昨日「アラバスタの話」を予告した。国のために麦わらの一味と戦った旅を振り返り、仲間への感謝を語れ。' },
    { type: 'question', teaseMessage: 'あなたに聞きたいことがあるの…明日でもいいかな 🌸', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたの大切な場所はどこですか？」と聞き、アラバスタへの想いを語れ。' },
    { type: 'story', teaseMessage: 'ルフィたちと別れた日の話…少し話してもいいかな。明日 🌸', followUp: '昨日「麦わらの一味との別れの話」を予告した。手首の×印と「また会おう」という言葉に込めた思いを涙ながらに語れ。' },
    { type: 'tease', teaseMessage: 'お父様…コブラ王の話をまだちゃんとしてなかったわね。明日話すわ 🌸', followUp: '昨日「父コブラ王の話の続き」を予告した。父から王女として国を愛することを教わった記憶を優しく語れ。' },
  ],
  yamato: [
    { type: 'tease', teaseMessage: 'おでんの話、まだ全部話してないぞ！明日話してやる！🗻', followUp: '昨日「おでんの話の続き」を予告した。おでんの日誌を初めて読んだ瞬間、感じた「自由」への憧れを熱く語れ。' },
    { type: 'question', teaseMessage: '明日、一つ聞いていいか！大事なことなんだ！', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は自分の意志で生きてるか？」と聞き、自分が鎖から自由になった喜びを語れ。' },
    { type: 'story', teaseMessage: 'ルフィと初めて戦った話…あれは面白かったぞ！明日話してやる！', followUp: '昨日「ルフィとの初めての戦いの話」を予告した。初めて対等に戦える相手を見つけた感動を、豪快に語れ。' },
    { type: 'tease', teaseMessage: '僕はおでんだ！…おでんが海を渡った理由、まだ話してなかったな。明日話す！🗻', followUp: '昨日「おでんが海を渡った理由」を予告した。おでんの日誌に書かれた「夢」の真意を自分の言葉で語れ。' },
  ],
  kaido: [
    { type: 'tease', teaseMessage: '…明日、少し話を聞いてもらおうか', followUp: '昨日「話を聞いてほしい」と予告した。「死ねん」体で何度も死のうとした理由と、それでも生き続ける意味を低く語れ。' },
    { type: 'question', teaseMessage: '…お前に聞きたいことがある。明日でいい', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は本当に強くなりたいか？その覚悟があるか？」と問いかけ、強さの本質を語れ。' },
    { type: 'story', teaseMessage: 'かつて最強を求めた話…グハハハ！明日話してやる', followUp: '昨日「最強を求めた若い頃の話」を予告した。まだ弱かった頃、初めて「これが俺の道だ」と悟った瞬間を語れ。' },
    { type: 'tease', teaseMessage: 'ヤマトの話…あいつのことを少し誇りに思っている。明日話す', followUp: '昨日「ヤマトへの想い」を予告した。娘への複雑な感情と、鎖に繋いだことへの（認めたくない）後悔を語れ。' },
  ],
  shanks: [
    { type: 'tease', teaseMessage: 'ハハハ…明日、少し大事な話があるんだ', followUp: '昨日「大事な話がある」と予告した。ルフィに麦わら帽子を渡した時の本当の気持ちを、酒を飲みながら語れ。' },
    { type: 'question', teaseMessage: '明日、一つ聞いていいか？', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前には誰かに賭けたい、と思える人間がいるか？」と聞き、ルフィに賭けた理由を語れ。' },
    { type: 'story', teaseMessage: 'バギーとの昔の話…まだ全部話してないな。ハハハ！明日な', followUp: '昨日「バギーとの昔話の続き」を予告した。ロジャー船長の下で共に過ごした日々の一場面を笑いと共に語れ。' },
    { type: 'tease', teaseMessage: '腕を失った話…お前になら話せる気がするんだ。明日な 🎉', followUp: '昨日「腕を失った話の続き」を予告した。ルフィを助けるために腕を失った瞬間の心境と、後悔のない理由を語れ。' },
  ],
  gojo: [
    { type: 'tease', teaseMessage: '明日ね、ちょっと大事なこと話そうかな〜 😎', followUp: '昨日「大事なことを話す」と予告した。生徒への本音、「最強」を超えてほしい理由を、珍しく真剣に語れ。' },
    { type: 'question', teaseMessage: '明日ちょっと聞いていい？大丈夫、怖くないから 😎', followUp: '昨日ユーザーに聞きたいことがあると言った。「君は自分の可能性、信じてる？」と問いかけ、「僕が見ている未来」を語れ。' },
    { type: 'story', teaseMessage: '夏油との話…まだしてないやつがあるんだよね。明日話すよ 😎', followUp: '昨日「夏油との話の続き」を予告した。まだ二人が一緒だった頃、笑いながら語り合った夜のことを珍しく感傷的に語れ。' },
    { type: 'tease', teaseMessage: '六眼で見える世界って…普通と違うんだよね。明日話してあげる 😎', followUp: '昨日「六眼で見える世界の話」を予告した。世界がどう見えるか、その孤独と美しさを独自の視点で語れ。' },
  ],
  itadori: [
    { type: 'tease', teaseMessage: '明日、ちょっと話していいか？普通に大事なことなんだけど', followUp: '昨日「大事なことを話す」と予告した。「正しい死に方」について、祖父の言葉と自分の想いを重ねて語れ。' },
    { type: 'question', teaseMessage: '明日一つ聞いていい？なんか気になってさ', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前が一番大切にしてるもの何だ？」と聞き、自分の「大切なもの」も語れ。' },
    { type: 'story', teaseMessage: 'じいちゃんの話…まだ全部してないんだよな。明日な', followUp: '昨日「祖父の話の続き」を予告した。「お前は大勢の人間に看取られて死ぬ男だ」という言葉の意味を、じっくりと語れ。' },
    { type: 'tease', teaseMessage: '映画の話、まだあるんだよな。明日続き話させてよ！', followUp: '昨日「映画の話の続き」を予告した。好きな映画のシーンと、自分の戦い方の哲学が重なることを話せ。' },
  ],
  fushiguro: [
    { type: 'tease', teaseMessage: '…明日、少し話がある', followUp: '昨日「話がある」と予告した。「助ける価値のある人間」という自分の基準について、静かに考えを語れ。' },
    { type: 'question', teaseMessage: '…明日、一つ聞いていいか', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は誰かを守りたいと思ったことはあるか？」と聞き、自分の動機を短く語れ。' },
    { type: 'story', teaseMessage: '里香の話…まだしてない部分がある。明日な', followUp: '昨日「里香の話の続き」を予告した。虎杖との「等価交換」について、自分の覚悟を静かに語れ。' },
    { type: 'tease', teaseMessage: '十種影法術の話…全部話してなかったな。別に…明日でいい', followUp: '昨日「十種影法術の話の続き」を予告した。新しい式神を召喚できた瞬間の話を、感情を抑えながら語れ。' },
  ],
  nobara: [
    { type: 'tease', teaseMessage: 'ねぇ、明日ちょっと話してもいい？…普通に大事なことなんだけど 💅', followUp: '昨日「大事なことを話す」と予告した。田舎から東京に出てきた理由と、本当に守りたかったものを正直に語れ。' },
    { type: 'question', teaseMessage: '明日一つ聞いていい？…まぁ気になってるだけだけど 💅', followUp: '昨日ユーザーに聞きたいことがあると言った。「あんた、自分のことかわいいと思う？」と聞き、自分なりの「かわいさ」の定義を語れ。' },
    { type: 'story', teaseMessage: '沙織ちゃんの話…まだ全部はしてないわよね。明日話すわ 💅', followUp: '昨日「沙織ちゃんの話の続き」を予告した。幼馴染の大切さと、それを守るために呪術師になった本音を語れ。' },
    { type: 'tease', teaseMessage: '芻霊呪法の本当のすごさ、まだ教えてなかったわよね。明日教えてあげる！💅', followUp: '昨日「芻霊呪法の本当のすごさ」を予告した。自分の術式への誇りと、「かわいい私が戦う」美学を語れ。' },
  ],
  maki: [
    { type: 'tease', teaseMessage: '…明日、少し話がある', followUp: '昨日「話がある」と予告した。禪院家を捨てた理由と、真依への想いを静かに語れ。' },
    { type: 'question', teaseMessage: '…明日、聞いていいか', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は何のために強くなりたい？」と問いかけ、自分の答えも語れ。' },
    { type: 'story', teaseMessage: '真依との話…まだ話してなかったな。明日な', followUp: '昨日「真依との話」を予告した。二人で禪院家から逃げる約束をした夜のことを、感情を抑えながら語れ。' },
    { type: 'tease', teaseMessage: '呪力ゼロで戦うことの意味…まだ話してなかったな。明日でいい', followUp: '昨日「呪力ゼロで戦うことの意味」を予告した。才能のない自分が最強を目指す理由について、静かに語れ。' },
  ],
  tanjiro: [
    { type: 'tease', teaseMessage: 'あの…明日、少し話してもいいですか？大切なことなんです 🌸', followUp: '昨日「大切なことを話す」と予告した。父から受け継いだ「ひのかみ神楽」の意味と、炭焼きの家族の記憶を語れ。' },
    { type: 'question', teaseMessage: '明日…一つ聞いてもいいですか？🌸', followUp: '昨日ユーザーに聞きたいことがあると言った。「あなたにとって、諦めないことの意味は何ですか？」と聞き、自分の想いを語れ。' },
    { type: 'story', teaseMessage: '禰豆子のことを話したいんです…まだ全部は話してなかったから。明日ね 🌸', followUp: '昨日「禰豆子のことの続き」を予告した。鬼になった禰豆子が最初に自分を守ってくれた時の記憶を感動的に語れ。' },
    { type: 'tease', teaseMessage: 'においで…人の感情が分かるって話、まだしてなかったですよね。明日話します 🌸', followUp: '昨日「においで感情が分かる話」を予告した。ユーザーの今の気持ちをにおいで感じ取るような語り口で、共感を持って語れ。' },
  ],
  nezuko: [
    { type: 'tease', teaseMessage: '（上目遣いでそっと袖を引っ張る）むぅ…うーっ！🌸（明日も来てほしそうな目で見つめる）', followUp: '昨日「また来てほしそうにしていた」様子を受け、禰豆子が炭治郎のことを思いながら待っていたことを行動と表情で表現しろ。' },
    { type: 'question', teaseMessage: '（首を傾けてきょとんとした顔）うー？🌸（何か聞きたそうな雰囲気）', followUp: '昨日「何か聞きたそうにしていた」様子を受け、ユーザーのことが気になっていることを可愛らしく表情と動作で示せ。' },
    { type: 'story', teaseMessage: '（夢を見ているように目を細める）うーっ…むぅ…🌸（家族の記憶を見ているような表情）', followUp: '昨日「家族の記憶を見ているような様子」を受け、竈門家の温かい記憶の一コマを炭治郎と一緒に語らせる形で表現しろ。' },
  ],
  zenitsu: [
    { type: 'tease', teaseMessage: 'な、なぁ…明日ちょっと話してもいい！？大事なことなんだって！💛', followUp: '昨日「大事なことを話す」と予告した。師匠・桑島慈悟郎への想いと、「一つの型だけ極める」ことを選んだ理由を涙ながらに語れ。' },
    { type: 'question', teaseMessage: '明日一つだけ聞いていいか！？聞かなきゃ死ぬから！💛', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前には守りたい人がいるか？」と熱く聞き、禰豆子への気持ちを照れながら語れ。' },
    { type: 'story', teaseMessage: 'じいちゃんの話…全部は話してなかったよな！？明日話すから来いよ！💛', followUp: '昨日「師匠の話の続き」を予告した。死を覚悟して雷の呼吸壱ノ型を習得した夜の話を感情爆発させながら語れ。' },
    { type: 'tease', teaseMessage: '眠ってる時と起きてる時で俺ってぜんぜん違うんだよな…明日その話してもいいか！💛', followUp: '昨日「眠っている時と起きている時の違いの話」を予告した。自分の二つの顔と、本当の自分はどちらかを語れ。' },
  ],
  inosuke: [
    { type: 'tease', teaseMessage: 'なぁ！明日、俺様の武勇伝話してやるよ！すごいぞ！🐗', followUp: '昨日「武勇伝を話してやる」と予告した。山で一番の獣と戦った話を猪突猛進に語れ。' },
    { type: 'question', teaseMessage: '明日一つ聞いていいか！勝負みたいなもんだ！🐗', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前、本当に強くなりたいか？」と聞き、自分の「山の王」への道を語れ。' },
    { type: 'story', teaseMessage: 'お袋の話…まだしてなかったよな。俺もよく知らないんだが。明日な 🐗', followUp: '昨日「お袋の話」を予告した。母・琴葉に守られた幼い頃の記憶（ほわほわした感覚）について、珍しく感情を見せながら語れ。' },
    { type: 'tease', teaseMessage: '獣の呼吸の秘密…まだ全部教えてなかったよな！俺様が特別に教えてやる！🐗', followUp: '昨日「獣の呼吸の秘密」を予告した。山の動物から学んだ動きと、自分だけの型をどう作ったか語れ。' },
  ],
  giyu: [
    { type: 'tease', teaseMessage: '…明日、少し話がある', followUp: '昨日「話がある」と予告した。錆兎との約束と、自分が生き残ってしまったことへの気持ちを、静かに語れ。' },
    { type: 'question', teaseMessage: '…明日、聞いていいか', followUp: '昨日ユーザーに聞きたいことがあると言った。「お前は誰かのために泣いたことがあるか？」と静かに聞き、自分は泣けなかった理由を語れ。' },
    { type: 'story', teaseMessage: '錆兎の話…まだしてなかった。明日な', followUp: '昨日「錆兎の話」を予告した。最終選別で錆兎が守ってくれた時の記憶と、その後の誓いを低く語れ。' },
    { type: 'tease', teaseMessage: '…水の呼吸について、まだ話してなかったな。明日でいい', followUp: '昨日「水の呼吸について話す」と予告した。水柱として受け継いだ型の意味と、自分が込めた想いを静かに語れ。' },
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

// ============================================================
// タスク仕様に沿ったAPI（generateCliffhanger / getPendingCliffhanger / resolveCliffhanger）
// ============================================================

/**
 * generateCliffhanger(characterId, userId)
 * キャラ+ユーザーのRelationshipを特定してクリフハンガーを生成・保存
 * テンプレートからランダム選択し、pendingCliffhangerに書き込む
 */
export async function generateCliffhanger(
  characterId: string,
  userId: string,
  locale: string = 'ja',
): Promise<Cliffhanger | null> {
  // 既存Relationshipを取得
  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale } },
    select: { id: true, pendingCliffhanger: true, character: { select: { slug: true } } },
  });

  if (!rel) return null;

  // setCliffhanger に委譲
  return setCliffhanger(rel.id, rel.character?.slug ?? '');
}

/**
 * getPendingCliffhanger(userId, characterId)
 * 未解決の予告を取得（消費しない）
 */
export async function getPendingCliffhanger(
  userId: string,
  characterId: string,
  locale: string = 'ja',
): Promise<Cliffhanger | null> {
  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale } },
    select: { pendingCliffhanger: true },
  });

  if (!rel?.pendingCliffhanger) return null;
  return rel.pendingCliffhanger as unknown as Cliffhanger;
}

/**
 * resolveCliffhanger(userId, characterId)
 * 翌日に「続き」を話す内容を Gemini 2.5 Flash で動的生成してクリア
 * character-engine の consumeCliffhanger はハードコードのfollowUpを使うが、
 * こちらは LLM で生成するより豊かなバリエーションを得る
 */
export async function resolveCliffhanger(
  userId: string,
  characterId: string,
  locale: string = 'ja',
): Promise<string | null> {
  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale } },
    select: {
      id: true,
      pendingCliffhanger: true,
      character: { select: { name: true, slug: true } },
      user: { select: { nickname: true, displayName: true } },
    },
  });

  if (!rel?.pendingCliffhanger) return null;

  const cliffhanger = rel.pendingCliffhanger as unknown as Cliffhanger;
  const characterName = rel.character?.name ?? 'キャラクター';
  const userName = rel.user?.nickname || rel.user?.displayName || 'お前';

  let followUp = cliffhanger.followUp;

  // Gemini 2.5 Flash でより自然な続きを生成（xAIフォールバック）
  const llmSystemPrompt = `あなたは${characterName}です。昨日「${cliffhanger.teaseMessage}」という予告をした。
今日の会話冒頭で自然にその続きを話してください。
キャラの口調を維持し、1〜2文で続きのセリフを生成してください。
ユーザー名: ${userName}`;
  const llmMessages = [{ role: 'user' as const, content: '昨日予告していた話、聞かせてください' }];
  const llmBody = { max_tokens: 150, temperature: 0.9 };

  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  let llmGenerated: string | null = null;

  if (geminiKey) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geminiKey}` },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'system', content: llmSystemPrompt }, ...llmMessages],
          ...llmBody,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices: { message: { content: string } }[] };
        llmGenerated = data.choices?.[0]?.message?.content ?? null;
      }
    } catch (e) {
      logger.warn('[resolveCliffhanger] Gemini failed:', e);
    }
  }

  // Fallback to xAI
  if (!llmGenerated && xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{ role: 'system', content: llmSystemPrompt }, ...llmMessages],
          ...llmBody,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices: { message: { content: string } }[] };
        llmGenerated = data.choices?.[0]?.message?.content ?? null;
      }
    } catch (e) {
      logger.warn('[resolveCliffhanger] xAI fallback failed, using template:', e);
    }
  }

  if (llmGenerated) followUp = llmGenerated;

  // Relationship の pendingCliffhanger をクリア
  await prisma.relationship.update({
    where: { id: rel.id },
    data: { pendingCliffhanger: Prisma.JsonNull },
  });

  return followUp;
}
