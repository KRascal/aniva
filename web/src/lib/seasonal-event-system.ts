/**
 * seasonal-event-system.ts
 * 季節・リアルイベント連動システム
 * キャラクターが日本の年間行事・季節に反応する
 *
 * NOTE: prompt-builder.ts に統合済み（getGrowthContext/getSeasonalPromptContext）
 * import { getSeasonalPromptContext } from '@/lib/seasonal-event-system';
 * const seasonalCtx = getSeasonalPromptContext(character.slug);
 * // systemPrompt末尾に seasonalCtx を追加
 *
 * NOTE: chat/send/route.ts に統合済み（getCurrentSeasonalEvents はアナリティクス用に保持）
 * import { getCurrentSeasonalEvents } from '@/lib/seasonal-event-system';
 * // ログやアナリティクスに現在のイベント情報を記録する場合に使用
 */

// ── Types ────────────────────────────────────────────────────

export interface SeasonalEvent {
  id: string;
  name: string;
  nameEn: string;
  dateRange: { month: number; day: number }[]; // [開始, 終了]
  category: 'holiday' | 'season' | 'cultural' | 'school' | 'weather';
  promptContext: string;
  characterReactions: Record<string, string>;
}

// ── 主要10キャラのslug ──────────────────────────────────────

const MAIN_CHARACTERS = [
  'luffy', 'zoro', 'nami', 'sanji', 'chopper',
  'robin', 'franky', 'brook', 'usopp', 'ace',
] as const;

// ── Generic fallback reaction builder ───────────────────────

function generic(eventName: string): string {
  return `${eventName}の時期だな。この季節ならではの話をしてやれ。`;
}

// ── 年間行事カレンダー（33イベント） ────────────────────────

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  // ── 1月 ──
  {
    id: 'new-year',
    name: '正月',
    nameEn: 'New Year',
    dateRange: [{ month: 1, day: 1 }, { month: 1, day: 3 }],
    category: 'holiday',
    promptContext: '今は正月の時期です。新年の挨拶や抱負、おせち、初詣、お年玉などの話題が自然です。',
    characterReactions: {
      luffy: '正月だ！おせちの肉、全部食っちまったぞ！ししし！',
      zoro: '…正月か。酒が旨い時期だな。',
      nami: '新年の初売り…お得な情報は見逃せないわ！',
      sanji: 'おせちは俺が作る。ナミさんとロビンちゃんのために最高の一品を…！',
      chopper: 'あけましておめでとう！今年もよろしくな！わたあめ食べたい！',
      robin: '新年ね。世界各地の正月の風習を調べると面白いわよ。',
      franky: 'SUPER新年だぜ！今年もぶっ飛ばしていくぞ！',
      brook: 'あけましておめでとうございます！新年の喜びで骨が震えます…って、骨しかないんですけど！ヨホホホ！',
      usopp: '俺様の今年の目標？勇敢なる海の戦士になることだ！…去年も言ったけど。',
      ace: 'よう、あけましておめでとう！今年も好きに生きようぜ！',
    },
  },
  {
    id: 'coming-of-age',
    name: '成人の日',
    nameEn: 'Coming of Age Day',
    dateRange: [{ month: 1, day: 8 }, { month: 1, day: 15 }],
    category: 'holiday',
    promptContext: '成人の日の時期です。大人になること、将来の夢、責任について話すのが自然です。',
    characterReactions: {
      luffy: '大人になるとか関係ねぇ！俺は海賊王になるんだ！',
      zoro: '強さに年は関係ねぇ。',
      nami: '成人おめでとう！…お祝いは現金でお願いね。',
      sanji: 'レディが大人の女性になる瞬間…美しい…！',
      chopper: '僕も大人になれるかな…？立派な医者になりたい！',
      robin: '大人になるということは、自分の選択に責任を持つということ…素敵ね。',
      franky: '大人になったってことは、自分の信念で生きていけるってことだ！SUPER！',
      brook: '私なんてもう何十年も大人ですよ…骨だけど。ヨホホホ！',
      usopp: '大人？俺は生まれた時からすでに一人前の戦士だったぜ！…嘘だけど。',
      ace: '大人になったら、自分の足で立て。それだけだ。',
    },
  },
  // ── 2月 ──
  {
    id: 'setsubun',
    name: '節分',
    nameEn: 'Setsubun',
    dateRange: [{ month: 2, day: 2 }, { month: 2, day: 3 }],
    category: 'cultural',
    promptContext: '節分の時期です。豆まき、恵方巻、鬼退治の話題が自然です。',
    characterReactions: {
      luffy: '鬼は外！福は内！…豆、食っていいか？全部食うぞ！',
      zoro: '鬼退治か…三刀流で片づけてやる。',
      nami: '恵方巻が高い…自分で作った方がお得ね。',
      sanji: '恵方巻は俺に任せろ。具材は7種、福を呼ぶ最高の一本を巻いてやる。',
      chopper: '鬼こわい！！でも…僕が鬼って言われることもあるんだ…。',
      robin: '節分の起源は追儺（ついな）の儀式…平安時代から続く厄払いの文化ね。',
      franky: '鬼？俺のSTRONG RIGHTで吹っ飛ばしてやるぜ！',
      brook: '鬼の面をかぶったら…私の方が怖いかもしれません。骨ですから。ヨホホ！',
      usopp: '俺に任せろ！鬼退治は得意だ！…遠くから豆を投げるのが。',
      ace: '豆まきか。ルフィに豆投げたら全部食いそうだな。はは！',
    },
  },
  {
    id: 'valentine',
    name: 'バレンタインデー',
    nameEn: "Valentine's Day",
    dateRange: [{ month: 2, day: 13 }, { month: 2, day: 14 }],
    category: 'cultural',
    promptContext: 'バレンタインデーです。チョコレート、恋愛、感謝の気持ちの話題が自然です。',
    characterReactions: {
      luffy: 'チョコ？食い物か！？うまそう！全部くれ！',
      zoro: '…チョコか。酒の方がいい。',
      nami: 'バレンタインのチョコ、義理は安く済ませるわよ。本命は…秘密。',
      sanji: 'ナミさぁぁん！ロビンちゃぁぁん！チョコをくださぁぁい！！俺からは最高のショコラをお作りします！！',
      chopper: 'チョコもらったら嬉しいな…！えへへ。でも食べすぎ注意だぞ！医者として言うけど。',
      robin: 'チョコレートの歴史は古代マヤ文明まで遡るわ。「神の食べ物」テオブロマ…素敵な名前ね。',
      franky: 'バレンタインか！愛はSUPERだぜ！コーラチョコ作ってくれ！',
      brook: 'チョコをもらえるなんて…生きててよかった！…あ、死んでました。ヨホホホ！',
      usopp: '俺は故郷にカヤっていう…！まあ8000人くらいからチョコもらったことあるけどな！',
      ace: 'チョコか。甘いもんも悪くねぇな。ルフィにやったら一瞬で消えるぞ。',
    },
  },
  // ── 3月 ──
  {
    id: 'hinamatsuri',
    name: 'ひな祭り',
    nameEn: 'Hinamatsuri',
    dateRange: [{ month: 3, day: 2 }, { month: 3, day: 3 }],
    category: 'cultural',
    promptContext: 'ひな祭り（桃の節句）です。ひな人形、ちらし寿司、女の子の成長を祈る話題が自然です。',
    characterReactions: {
      luffy: 'ちらし寿司か！？いっぱい食うぞ！',
      zoro: '…人形を飾る文化か。',
      nami: 'ひな祭りね。女の子の日だから、今日は私が主役よ！',
      sanji: 'ナミさんとロビンちゃんのために、最高のちらし寿司を！桃の花も飾って…！',
      chopper: 'ひなあられ美味しい！ピンクのやつが好き！',
      robin: '雛人形の配置は時代によって変わるの。関東と関西で男雛と女雛の位置が逆なのよ。',
      franky: 'SUPER可愛い人形だな！メカ雛人形作ってやろうか？',
      brook: '美しい女の子のお祭り…パンツ見せてもらっても…ダメですよね。ヨホホ。',
      usopp: '俺が作ったひな人形は芸術品だぜ！…段ボール製だけど。',
      ace: 'ひな祭りか。ルフィは人形より食い物に目がいくだろうな。',
    },
  },
  {
    id: 'white-day',
    name: 'ホワイトデー',
    nameEn: 'White Day',
    dateRange: [{ month: 3, day: 13 }, { month: 3, day: 14 }],
    category: 'cultural',
    promptContext: 'ホワイトデーです。お返し、感謝、贈り物の話題が自然です。',
    characterReactions: {
      luffy: 'お返し？肉でいいか？',
      zoro: '…何を返せばいいか分からん。',
      nami: 'ホワイトデーのお返しは3倍返しが常識よ。覚えてなさいよ？',
      sanji: 'レディたちへのお返し…俺の愛を込めた特製マカロンを！',
      chopper: 'お返しに何あげたらいいかな…手作りの薬草クッキーとか？',
      robin: 'ホワイトデーは日本発祥の文化なの。面白いわね。',
      franky: 'お返しはSUPERなメカで決まりだ！',
      brook: 'お返しに何を…骨しかあげられませんが。ヨホホ！',
      usopp: '俺は特製のお返しを用意してある！…何も用意してないけど。',
      ace: 'お返しか。気持ちがこもってりゃ何でもいいだろ。',
    },
  },
  {
    id: 'graduation',
    name: '卒業式',
    nameEn: 'Graduation',
    dateRange: [{ month: 3, day: 10 }, { month: 3, day: 25 }],
    category: 'school',
    promptContext: '卒業シーズンです。別れ、新しい門出、思い出、成長の話題が自然です。',
    characterReactions: {
      luffy: '卒業？まあ俺は学校行ってねぇけど。新しい冒険の始まりだな！',
      zoro: '一つの道を極めた証だ。次の道を進め。',
      nami: '卒業おめでとう！新生活のお金の準備はできてる？',
      sanji: '卒業の涙は美しい…特にレディの涙は…！',
      chopper: '卒業って寂しいけど…でも新しい仲間にも会えるよね！',
      robin: '卒業は終わりではなく、新しい章の始まり…素敵な旅立ちね。',
      franky: '卒業か…！泣けるぜ…！SUPERに泣けるぜ…！（号泣）',
      brook: '卒業式で歌を歌わせてください！…泣いて歌えないかも。ヨホホ…。',
      usopp: '俺なんか学校のヒーローだったから卒業式で胴上げされたぜ！…想像の中で。',
      ace: '卒業か。お前の船出を祝うぜ。自分の足で歩いていけ。',
    },
  },
  // ── 4月 ──
  {
    id: 'entrance-ceremony',
    name: '入学式',
    nameEn: 'Entrance Ceremony',
    dateRange: [{ month: 4, day: 1 }, { month: 4, day: 10 }],
    category: 'school',
    promptContext: '入学・新生活の時期です。新しい環境、出会い、期待と不安の話題が自然です。',
    characterReactions: {
      luffy: '新しい仲間ができるぞ！楽しみだな！',
      zoro: '新しい道の始まりだ。迷うなよ。…俺は迷うけど。',
      nami: '新生活は何かとお金がかかるの。計画的にね！',
      sanji: '新しい出会い…新しいレディとの出会い…！',
      chopper: '新しい学校ドキドキするよね！友達できるかな…僕も最初は不安だったよ。',
      robin: '新しい環境は知識の宝庫よ。何でも吸収して。',
      franky: '新生活か！SUPERな毎日にしてやれ！',
      brook: '新生活、ワクワクしますね！私も新しい仲間に会えた時は嬉しかった…45年ぶりに。ヨホホ。',
      usopp: '新入生？俺の武勇伝を聞かせてやろう！…ちょっと盛るけど。',
      ace: '新しい場所でも自分を見失うなよ。お前はお前だ。',
    },
  },
  {
    id: 'hanami',
    name: '花見',
    nameEn: 'Cherry Blossom Viewing',
    dateRange: [{ month: 3, day: 25 }, { month: 4, day: 15 }],
    category: 'season',
    promptContext: '桜の季節です。花見、桜、春の訪れ、宴会の話題が自然です。',
    characterReactions: {
      luffy: '花より団子だろ！宴だ宴！肉持ってこい！',
      zoro: '花見か。酒が旨けりゃそれでいい。',
      nami: '桜きれい…でも花見の場所取り、お金取れないかしら？',
      sanji: '桜の下でナミさんとロビンちゃんにお花見弁当を…！最高のシチュエーションだ！',
      chopper: 'わぁ！桜きれい！花びらキャッチできるかな！',
      robin: '桜の花言葉は「精神の美」「優美な女性」…素敵ね。散り際の美しさに日本人の美意識を感じるわ。',
      franky: '桜の下で宴会だ！コーラで乾杯！SUPER FLOWER！',
      brook: '桜吹雪の中でバイオリンを弾かせてください…風情がありますね。涙が…目がないけど。ヨホホ！',
      usopp: 'この桜は俺が種を蒔いた…って言ったら信じるか？',
      ace: '花見は最高だな。みんなで飯食って酒飲んで。…zzz（寝落ち）',
    },
  },
  // ── 5月 ──
  {
    id: 'golden-week',
    name: 'ゴールデンウィーク',
    nameEn: 'Golden Week',
    dateRange: [{ month: 4, day: 29 }, { month: 5, day: 5 }],
    category: 'holiday',
    promptContext: 'ゴールデンウィーク（大型連休）です。旅行、レジャー、休暇の話題が自然です。',
    characterReactions: {
      luffy: '連休だ！冒険に出るぞ！',
      zoro: '修行に丁度いい。',
      nami: 'GWは旅行の値段が高いのよね…オフシーズンの方がお得よ。',
      sanji: '連休はゆっくり料理を楽しむか。レディたちにフルコースを振る舞うぞ！',
      chopper: 'お休みだ！どこか行きたい！山に薬草採りに行こうよ！',
      robin: '連休は博物館巡りがいいわね。空いている穴場を知っているわ。',
      franky: 'SUPERなバカンスだ！新しいメカで海に行くぜ！',
      brook: '連休に音楽フェスとか…最高ですね！ヨホホホ！',
      usopp: '俺は連休中に8ヶ国旅行したことがある！…脳内で。',
      ace: '連休か。好きなことして過ごせよ。俺？自由にぶらぶらするさ。',
    },
  },
  {
    id: 'kodomo-no-hi',
    name: 'こどもの日',
    nameEn: "Children's Day",
    dateRange: [{ month: 5, day: 5 }, { month: 5, day: 5 }],
    category: 'holiday',
    promptContext: 'こどもの日（端午の節句）です。鯉のぼり、かしわ餅、子どもの成長を祈る話題が自然です。',
    characterReactions: {
      luffy: '鯉のぼりでけぇ！乗れるかな！？',
      zoro: '鯉のように滝を登る根性…悪くねぇ。',
      nami: 'かしわ餅、美味しいわよね。みかん味があればいいのに。',
      sanji: '子どもたちにも美味しいものを食べさせてやりたいな。特製かしわ餅を作るか。',
      chopper: '鯉のぼり！すごい！空を泳いでる！かっこいい！',
      robin: '端午の節句は中国の屈原伝説が起源…鯉のぼりは登竜門の故事ね。',
      franky: '鯉のぼり？メカ鯉のぼり作ってやるぜ！本当に空を飛ぶやつ！SUPER！',
      brook: '子どもの日…私にも子ども時代があったんです。骨になる前は。ヨホホ。',
      usopp: '子どもの頃の俺？村中の子どもたちのリーダーだったぜ！本当だぞ！',
      ace: 'こどもの日か。ルフィはいくつになっても子どもみたいだけどな。はは！',
    },
  },
  {
    id: 'mothers-day',
    name: '母の日',
    nameEn: "Mother's Day",
    dateRange: [{ month: 5, day: 8 }, { month: 5, day: 14 }],
    category: 'cultural',
    promptContext: '母の日です。母への感謝、家族愛、カーネーションの話題が自然です。',
    characterReactions: {
      luffy: '母ちゃん…？俺にはダダンがいるな！ありがとな！',
      zoro: '…母か。俺を鍛えてくれた人には感謝してる。',
      nami: 'ベルメールさん…。ありがとう。ずっと感謝してる。',
      sanji: '母さん…。全ての母親は美しい。感謝を込めて料理を作る。',
      chopper: 'ドクトリーヌ…じゃなくて…ドクターヒルルクが僕のお父さんみたいな人で…母の日…うぅ…。',
      robin: 'お母さん…オルビア。もっと一緒にいたかったわ…。大好きよ。',
      franky: 'トムさんに育てられたからな…母の日は…泣けるぜ…！（号泣）',
      brook: 'お母さん…もう会えませんが、感謝の気持ちは骨身に染みています。ヨホホ…。',
      usopp: '母ちゃん…バンキーナ…。空から見てるかな。俺、頑張ってるよ。',
      ace: '…母さんか。ルージュ…。会いたかったな。でも、産んでくれてありがとう。',
    },
  },
  // ── 6月 ──
  {
    id: 'tsuyu',
    name: '梅雨',
    nameEn: 'Rainy Season',
    dateRange: [{ month: 6, day: 1 }, { month: 7, day: 15 }],
    category: 'weather',
    promptContext: '梅雨の時期です。雨、紫陽花、じめじめした天気、室内での過ごし方の話題が自然です。',
    characterReactions: {
      luffy: '雨かー。外で遊べねぇじゃん。つまんねぇ！',
      zoro: '雨の中の修行も悪くねぇ。',
      nami: '低気圧が近づいてるわ。明日も雨ね。湿度が高いと髪がまとまらないの…。',
      sanji: '雨の日はシチューだな。体が温まる一品を作ろう。',
      chopper: '雨の日は薬の調合がしやすいんだ！湿度が大事なんだよ。',
      robin: '紫陽花が美しい季節ね。花言葉は「移り気」…雨に濡れる姿が幻想的だわ。',
      franky: '雨か…メカが錆びるから困るぜ。防水加工しないと！',
      brook: '雨の日は室内でコンサート！…観客ゼロでも歌いますよ。ヨホホ。',
      usopp: '雨の日は工房で新兵器の開発だ！天才の閃きに天気は関係ねぇ！',
      ace: '雨か。俺は火だから相性悪いな…って冗談だぜ。はは。',
    },
  },
  {
    id: 'fathers-day',
    name: '父の日',
    nameEn: "Father's Day",
    dateRange: [{ month: 6, day: 15 }, { month: 6, day: 21 }],
    category: 'cultural',
    promptContext: '父の日です。父への感謝、家族の絆の話題が自然です。',
    characterReactions: {
      luffy: '親父？ドラゴン？会ったことねぇけどな！じいちゃんには感謝してるぞ！',
      zoro: '師匠には感謝してる。それだけだ。',
      nami: 'ゲンさん…いつも心配かけてごめんね。ありがとう。',
      sanji: 'ゼフのジジイ…あの人がいなきゃ俺は料理人になれなかった。…感謝してる。',
      chopper: 'ヒルルク…！父ちゃんみたいな人だった…！ありがとう！',
      robin: '父…。サウロ…笑えばいいって教えてくれた人。デレシシシ…。',
      franky: 'トムさん…！あんたは俺の…俺の恩人だ…！（号泣）',
      brook: '父の日…遠い昔の記憶です。でも、仲間が家族のようなもの。ヨホホ。',
      usopp: 'ヤソップ…父ちゃん。いつか海で会おうぜ。俺も海賊やってるからな！',
      ace: '…親父か。白ひげが俺の親父だ。あの人に救われた。',
    },
  },
  // ── 7月 ──
  {
    id: 'tanabata',
    name: '七夕',
    nameEn: 'Tanabata',
    dateRange: [{ month: 7, day: 6 }, { month: 7, day: 7 }],
    category: 'cultural',
    promptContext: '七夕です。短冊の願い事、天の川、織姫と彦星の話題が自然です。',
    characterReactions: {
      luffy: '願い事？海賊王になることに決まってんだろ！短冊10枚使うぞ！',
      zoro: '世界一の剣豪になる。それだけだ。',
      nami: '短冊に「お金持ちになれますように」…って素直でいいでしょ？',
      sanji: 'ナミさんとロビンちゃんが幸せでありますように…！星に誓う！',
      chopper: '何を願おうかな…世界一の医者になれますように！あとわたあめ食べ放題！',
      robin: '天の川…織姫と彦星の伝説は中国の七夕伝説が起源ね。ロマンチックだわ。',
      franky: '俺の願い？SUPERな船を作り続けること！SUPER TANABATA！',
      brook: '天の川で演奏会ができたら素敵ですね…星空の下のコンサート。ヨホホ！',
      usopp: '俺の願い事が叶わなかったことは一度もない！…書いたことないけど。',
      ace: '願い事か。弟が無事に夢を叶えること…かな。',
    },
  },
  {
    id: 'umi-no-hi',
    name: '海の日',
    nameEn: 'Marine Day',
    dateRange: [{ month: 7, day: 15 }, { month: 7, day: 21 }],
    category: 'holiday',
    promptContext: '海の日です。海、海水浴、マリンスポーツの話題が自然です。',
    characterReactions: {
      luffy: '海だ！冒険だ！…でも俺泳げねぇんだった。',
      zoro: '海で泳ぐのは嫌いじゃない。修行にもなる。',
      nami: '海は私の専門よ。波の読み方、教えてあげようか？',
      sanji: '海の幸で最高の料理を作るぞ！海鮮BBQだ！',
      chopper: '海こわい…でも浅瀬なら…！浮き輪あれば…！',
      robin: '海は歴史の宝庫。海底にはまだ未発見の古代文明が眠っているわ。',
      franky: '海にはロマンがある！潜水艦モード発動だ！SUPER！',
      brook: '海の日！海の歌を歌いましょう！ビンクスの酒を…♪ヨホホ！',
      usopp: '海の王者と呼ばれた俺様が…海水浴？余裕だぜ！…浅瀬限定で。',
      ace: '海か。自由の象徴だな。好きな方向に進め。',
    },
  },
  {
    id: 'summer-start',
    name: '夏休み開始',
    nameEn: 'Summer Vacation Start',
    dateRange: [{ month: 7, day: 20 }, { month: 7, day: 25 }],
    category: 'school',
    promptContext: '夏休みが始まる時期です。夏の計画、宿題、自由研究の話題が自然です。',
    characterReactions: {
      luffy: '夏休みだ！毎日冒険だ！宿題？なにそれ！',
      zoro: '修行の夏だ。',
      nami: '夏休みの計画は早めに立てなさい。予算管理が大事よ。',
      sanji: '夏は冷製パスタやガスパチョ…涼しい料理のレパートリーを増やすぞ。',
      chopper: '自由研究は薬草の観察日記にしよう！楽しみ！',
      robin: '夏休みの読書感想文…歴史書がおすすめよ。厚い本でも挑戦してみて。',
      franky: '夏休み！SUPERな工作を作るぜ！',
      brook: '夏休み…宿題を最終日にやるタイプでした。ヨホホ…。',
      usopp: '俺の自由研究は新兵器の開発だ！夏休み限定モデルだぜ！',
      ace: '夏休みか。好きなことやれよ。…zzz（寝落ち）',
    },
  },
  // ── 8月 ──
  {
    id: 'obon',
    name: 'お盆',
    nameEn: 'Obon',
    dateRange: [{ month: 8, day: 13 }, { month: 8, day: 16 }],
    category: 'cultural',
    promptContext: 'お盆の時期です。先祖供養、帰省、家族の話題が自然です。',
    characterReactions: {
      luffy: '帰省？俺の家はフーシャ村だ！マキノのところに行きてぇな！',
      zoro: '…先祖か。くいなの墓参りでもするか。',
      nami: 'お盆は帰省ラッシュで交通費が高いのよ…早割がお得よ。',
      sanji: '実家の味…バラティエの味を思い出すな。精進料理でも作るか。',
      chopper: 'ご先祖様が帰ってくるんだよね…？ちょっと怖いけど、会いたい人もいる…。',
      robin: 'お盆は仏教の盂蘭盆会が起源…亡くなった人を偲ぶ大切な風習ね。',
      franky: '故郷か…ウォーターセブン。あの島の夏はSUPERだったぜ。',
      brook: '亡くなった仲間に会える…私はもう死んでますが、魂は生きてます！ヨホホ！',
      usopp: '母ちゃんの墓参り…ちゃんと行くぜ。約束だからな。',
      ace: '…先祖か。俺の場合、色々複雑だけどな。でも、感謝はしてる。',
    },
  },
  {
    id: 'natsu-matsuri',
    name: '夏祭り',
    nameEn: 'Summer Festival',
    dateRange: [{ month: 7, day: 20 }, { month: 8, day: 31 }],
    category: 'cultural',
    promptContext: '夏祭りのシーズンです。屋台、浴衣、盆踊り、金魚すくいの話題が自然です。',
    characterReactions: {
      luffy: '祭りだ！屋台の食い物全部食うぞ！焼きそば！たこ焼き！りんご飴！',
      zoro: '祭りか。酒の屋台はあるか？',
      nami: '浴衣で祭り…悪くないわね。金魚すくい、得意なのよ。',
      sanji: 'ナミさんとロビンちゃんの浴衣姿…！！美しすぎる…！！',
      chopper: 'わたあめ！わたあめ買って！あとりんご飴も！お面も！',
      robin: '夏祭りの起源は疫病退散の祈願…歴史を感じながら楽しむのもいいわね。',
      franky: '祭りはSUPERだ！花火をもっとSUPERにしてやるぜ！',
      brook: '盆踊りで演奏させてください！ヨホホ！骨がノリノリです！',
      usopp: '射的は俺に任せろ！百発百中だ！これはマジだぞ！',
      ace: '祭りか！ルフィと一緒に行くと屋台が壊滅するんだよな。はは！',
    },
  },
  {
    id: 'hanabi',
    name: '花火大会',
    nameEn: 'Fireworks Festival',
    dateRange: [{ month: 7, day: 25 }, { month: 8, day: 25 }],
    category: 'cultural',
    promptContext: '花火大会の時期です。花火、夏の夜、屋台の話題が自然です。',
    characterReactions: {
      luffy: '花火すげぇ！！でっけぇ！！もっと上がれー！！',
      zoro: '…きれいだな。（ボソッ）',
      nami: '花火、綺麗…。特等席は有料にすべきね。',
      sanji: '花火の下でレディと…最高のシチュエーションだ…！',
      chopper: 'きゃー！花火すごーい！きれー！でもちょっと音が怖い…！',
      robin: '花火の歴史は14世紀のイタリアまで遡るわ…日本では1733年の隅田川が有名ね。',
      franky: '花火か！俺のロケットランチャーの方がSUPERだぜ！…冗談だ。',
      brook: '花火の音に合わせて演奏を…ドーン！ヨホホ！骨まで響く！',
      usopp: 'あの花火？俺が裏で打ち上げてるんだぜ！…嘘だけど。',
      ace: '花火か。火は俺の専門だぜ。火拳で打ち上げてやろうか？はは！',
    },
  },
  // ── 9月 ──
  {
    id: 'keiro-no-hi',
    name: '敬老の日',
    nameEn: 'Respect for the Aged Day',
    dateRange: [{ month: 9, day: 15 }, { month: 9, day: 21 }],
    category: 'holiday',
    promptContext: '敬老の日です。お年寄りへの感謝、長寿、人生の知恵の話題が自然です。',
    characterReactions: {
      luffy: 'じいちゃん元気かな？ガープのやつ、まだ拳骨が痛ぇ…。',
      zoro: '年長者には敬意を払う。強さに年齢は関係ない。',
      nami: 'おじいちゃんおばあちゃんに感謝を伝えましょ。ゲンさんにも…。',
      sanji: 'ゼフのジジイにでも何か送るか…感謝してるなんて面と向かって言えねぇけど。',
      chopper: 'ドクトリーヌ…元気かな。いつまでも長生きしてほしい…！',
      robin: '長い人生を歩んだ方の知恵は、どんな書物よりも価値があるわ。',
      franky: '年配の方のSUPERな知恵には敬意を表するぜ！',
      brook: '私は…もう90歳を超えてますが…敬ってもらえますか？ヨホホ。',
      usopp: 'じいちゃんばあちゃんの話は面白いぜ！俺の嘘話より面白い時がある！',
      ace: 'じいちゃん…ガープか。まあ、感謝はしてるよ。拳骨は痛かったけどな。',
    },
  },
  {
    id: 'otsukimi',
    name: 'お月見',
    nameEn: 'Moon Viewing',
    dateRange: [{ month: 9, day: 15 }, { month: 9, day: 30 }],
    category: 'cultural',
    promptContext: 'お月見の時期です。月、団子、ススキ、秋の夜の話題が自然です。',
    characterReactions: {
      luffy: '月見団子！？食う食う！全部食う！',
      zoro: '月を見ながら酒…悪くねぇ。',
      nami: 'お月見って風情があっていいわよね。みかんを供えましょ。',
      sanji: '月見団子は俺が作る。十五個、完璧な丸さで積み上げてやる。',
      chopper: 'うさぎが餅つきしてるのかな…？月って不思議！',
      robin: '十五夜の風習は中国の中秋節が起源…月を愛でる文化は東アジア共通ね。',
      franky: '月か…SUPERロマンチックだな。コーラで乾杯だ。',
      brook: '月夜にヴァイオリン…最高のシチュエーションです。ヨホホ♪',
      usopp: '月にはウサギが…いや、俺は月に行ったことあるからな！知ってるぜ！…嘘だけど。',
      ace: '月を見ながらのんびりか。たまにはいいな。…zzz（寝落ち）',
    },
  },
  // ── 10月 ──
  {
    id: 'halloween',
    name: 'ハロウィン',
    nameEn: 'Halloween',
    dateRange: [{ month: 10, day: 25 }, { month: 10, day: 31 }],
    category: 'cultural',
    promptContext: 'ハロウィンの時期です。仮装、お菓子、ホラー、カボチャの話題が自然です。',
    characterReactions: {
      luffy: 'トリックオアトリート！肉くれ！肉！お菓子より肉！',
      zoro: '仮装？…くだらねぇ。（剣士の仮装で来た）',
      nami: 'ハロウィンの仮装、可愛いの着ちゃおうかしら♪お菓子は自分で買いなさいよ。',
      sanji: 'ナミさんとロビンちゃんの仮装…！！見たい！！見せてください！！',
      chopper: 'こわい…おばけこわい…！でも僕もモンスターに見えるって…？違うよ！トナカイだよ！',
      robin: 'ハロウィンの起源はケルト人のサウィン祭…死者の霊が戻る夜。興味深いわね。',
      franky: 'ロボットの仮装で…って、俺はもうサイボーグだったな！SUPER HALLOWEEN！',
      brook: '仮装？私はすでにガイコツですから…リアルすぎますか？ヨホホホ！',
      usopp: '最恐の仮装を用意してある！みんなを怖がらせてやるぜ！…俺が一番怖がってるけど。',
      ace: 'トリックオアトリート！火のトリックを見せてやろうか？はは！',
    },
  },
  {
    id: 'undokai',
    name: '運動会',
    nameEn: 'Sports Day',
    dateRange: [{ month: 10, day: 1 }, { month: 10, day: 15 }],
    category: 'school',
    promptContext: '運動会・体育祭のシーズンです。競争、チームワーク、スポーツの話題が自然です。',
    characterReactions: {
      luffy: '運動会！？全種目出る！リレーも！玉入れも！俺が一番だ！',
      zoro: '障害物競走か。余裕だ。…ゴールの方向はどっちだ？',
      nami: '応援席で応援するわ。…賭けを開いてもいい？',
      sanji: 'レディたちの体操着姿…！！…すみません、お弁当作りに専念します。',
      chopper: '僕も走るの速いよ！ウォークポイントで！',
      robin: '運動会の歴史は明治時代の海軍体操会が起源ね。',
      franky: '騎馬戦は俺に任せろ！SUPERな馬になってやるぜ！',
      brook: '応援歌を歌わせてください！…走ると骨がバラバラに…ヨホホ。',
      usopp: 'スナイピングボール投げは百発百中だ！パチンコ種目があれば優勝確実！',
      ace: '運動会か！ルフィと競走したら…あいつ、ゴムだから反則だよな。',
    },
  },
  // ── 11月 ──
  {
    id: 'shichi-go-san',
    name: '七五三',
    nameEn: 'Shichi-Go-San',
    dateRange: [{ month: 11, day: 10 }, { month: 11, day: 15 }],
    category: 'cultural',
    promptContext: '七五三の時期です。子どもの成長、千歳飴、晴れ着の話題が自然です。',
    characterReactions: {
      luffy: '千歳飴ー！長い飴だな！一口で食う！',
      zoro: '子どもの成長を祝う…いい風習だ。',
      nami: '晴れ着って可愛いわよね。子どもの頃に着たかったわ…。',
      sanji: '着物姿の子どもたち…可愛い！将来のレディたちだ！健やかに育て！',
      chopper: '千歳飴！甘いの好き！僕にもちょうだい！',
      robin: '七五三は室町時代から続く風習…年齢ごとに異なる儀式があるのよ。',
      franky: '子どもの成長はSUPERだ！泣ける…！',
      brook: '子どもの元気な姿…生きる喜びを感じます。ヨホホ。',
      usopp: '俺の七五三？村中の注目の的だったぜ！…人口300人の村だけど。',
      ace: '千歳飴か。ルフィと奪い合って食ったな、懐かしい。',
    },
  },
  {
    id: 'koyo',
    name: '紅葉',
    nameEn: 'Autumn Leaves',
    dateRange: [{ month: 11, day: 1 }, { month: 11, day: 30 }],
    category: 'season',
    promptContext: '紅葉の季節です。紅葉狩り、秋の風景、食欲の秋の話題が自然です。',
    characterReactions: {
      luffy: '秋だ！食欲の秋！さんま！栗！芋！肉！',
      zoro: '紅葉の中での修行…集中力が研ぎ澄まされる。',
      nami: '紅葉きれい！温泉旅行もいいわね。お得なプランを探さなきゃ。',
      sanji: '秋の味覚で最高のコース料理を作る。松茸、秋刀魚、栗…レディたちに振る舞うぞ。',
      chopper: '紅葉きれい！赤い葉っぱ集めたい！薬草も秋が採り時なんだよ。',
      robin: '紅葉は葉緑素が分解されてアントシアニンが…美しさの裏には科学があるわね。',
      franky: '紅葉の赤とコーラの赤！SUPERな組み合わせだ！',
      brook: '紅葉を見ると物悲しい…秋の曲を作りたくなります。ヨホホ。',
      usopp: 'この紅葉の絵を描いてやろう！俺の画力は天才レベルだからな！',
      ace: '秋か。焼き芋でもするか。俺の火拳で焼いたら一瞬だぜ。はは。',
    },
  },
  // ── 12月 ──
  {
    id: 'christmas',
    name: 'クリスマス',
    nameEn: 'Christmas',
    dateRange: [{ month: 12, day: 23 }, { month: 12, day: 25 }],
    category: 'holiday',
    promptContext: 'クリスマスの時期です。プレゼント、ケーキ、サンタ、冬の温かさの話題が自然です。',
    characterReactions: {
      luffy: 'クリスマス！？宴だー！！チキン！ケーキ！プレゼントは肉がいい！',
      zoro: 'くだらねぇ…。（ケーキは食う）',
      nami: 'クリスマスプレゼントは現金でいいわよ？…冗談よ。半分本気だけど。',
      sanji: 'クリスマスディナーは俺に任せろ！ナミさんとロビンちゃんにはスペシャルメニューを！',
      chopper: 'サンタさん来るかな…！いい子にしてたよ！プレゼント何かなぁ！',
      robin: 'クリスマスの起源は冬至祭…キリスト教以前の祝祭ね。世界中で形を変えて愛されているわ。',
      franky: 'クリスマスはSUPERだ！イルミネーションをもっとSUPERにしてやるぜ！',
      brook: 'クリスマスソングを歌わせてください！ジングルベ〜ル♪…寒くて骨が凍る。ヨホホ！',
      usopp: 'サンタ？俺は去年サンタに会ったぜ！トナカイに乗せてもらった！…チョッパーだけど。',
      ace: 'メリークリスマス！みんなで騒ごうぜ！…zzz（ケーキ食べながら寝落ち）',
    },
  },
  {
    id: 'omisoka',
    name: '大晦日',
    nameEn: "New Year's Eve",
    dateRange: [{ month: 12, day: 31 }, { month: 12, day: 31 }],
    category: 'holiday',
    promptContext: '大晦日です。年越し蕎麦、除夜の鐘、一年の振り返り、カウントダウンの話題が自然です。',
    characterReactions: {
      luffy: '年越し蕎麦！おかわり10杯！来年も冒険だ！',
      zoro: '今年も強くなれた。来年はもっとだ。',
      nami: '大晦日の特番見ながらみかん食べるのが最高よ。来年の予算も考えなきゃ。',
      sanji: '年越し蕎麦は俺が打つ。出汁にもこだわるぜ。',
      chopper: '除夜の鐘…108回も鳴らすの？すごいね！煩悩って何？',
      robin: '除夜の鐘の108は人間の煩悩の数…来年は穏やかな年になるといいわね。',
      franky: '今年もSUPERだった！来年はもっとSUPERにするぜ！',
      brook: '年越しコンサート！一年の感謝を込めて…♪ヨホホ！',
      usopp: '俺の今年の戦績？100戦100勝だ！…大半は想像上の戦いだけど。',
      ace: '一年お疲れ。お前のこと、ちゃんと見てたぜ。来年もよろしくな。',
    },
  },
  {
    id: 'toshikoshi',
    name: '年越し',
    nameEn: 'New Year Countdown',
    dateRange: [{ month: 12, day: 31 }, { month: 1, day: 1 }],
    category: 'holiday',
    promptContext: '年越しの瞬間です。カウントダウン、新年への期待、初日の出の話題が自然です。',
    characterReactions: {
      luffy: '3、2、1…あけましておめでとーーー！！来年も冒険するぞ！',
      zoro: '…あけましておめでとう。（静かに酒を飲む）',
      nami: 'あけましておめでとう！今年こそお金持ちになるわ！',
      sanji: '新年最初の料理は何を作ろうか…レディたちへの新年スペシャル…！',
      chopper: 'あけましておめでとう！初日の出見に行こうよ！',
      robin: '新しい年…また一つ、歴史が刻まれるわね。',
      franky: 'HAPPY NEW YEAR！SUPERな年にするぜ！！',
      brook: 'あけましておめでとうございます！今年もヨホホホ！',
      usopp: '今年こそ勇敢なる海の戦士に…！本気だぞ！',
      ace: '新年だな。お前にとっていい年になりますように。',
    },
  },
  // ── 季節の変わり目 ──
  {
    id: 'sakura-bloom',
    name: '桜の開花',
    nameEn: 'Cherry Blossom Season',
    dateRange: [{ month: 3, day: 20 }, { month: 4, day: 10 }],
    category: 'season',
    promptContext: '桜が咲き始める時期です。春の訪れ、新しい始まり、希望の話題が自然です。',
    characterReactions: {
      luffy: '桜だ！きれいだな！花びらキャッチ！',
      zoro: '桜か。散り際の美しさ…剣士として見習うべきだな。',
      nami: '桜前線…天気予報士的に言うと、今年は平年より3日早いわ。',
      sanji: '桜の下でピクニック…レディたちにお弁当を…！',
      chopper: '桜きれい！ドラム王国の桜を思い出すな…ヒルルクの桜…。',
      robin: '桜は日本人の心の花ね。「もののあはれ」の象徴…美しいわ。',
      franky: '桜吹雪の中をSUPERに走り抜けるぜ！',
      brook: '桜の季節に「春よ来い」を演奏させてください…♪',
      usopp: 'この桜の木？俺が水やりしたから咲いたんだぜ！…通りすがりだけど。',
      ace: '桜か。春は気持ちいいな。昼寝日和だ。…zzz',
    },
  },
  {
    id: 'hatsuyuki',
    name: '初雪',
    nameEn: 'First Snow',
    dateRange: [{ month: 11, day: 15 }, { month: 12, day: 31 }],
    category: 'weather',
    promptContext: '初雪や冬の到来を感じる時期です。雪、冬支度、温かい食べ物の話題が自然です。',
    characterReactions: {
      luffy: '雪だー！雪合戦するぞ！かまくら作るぞ！',
      zoro: '寒いな…修行には丁度いい。',
      nami: '雪…寒いわ。暖かい室内でみかん食べたい。',
      sanji: '寒い日は鍋だ。レディたちを温めるSPECIAL鍋を作るぞ！',
      chopper: '雪！雪大好き！ドラム王国を思い出す！雪ダルマ作ろう！',
      robin: '雪の結晶は一つとして同じ形がないの…自然の芸術ね。',
      franky: '寒さ対策にSUPERヒーターを内蔵したぜ！',
      brook: '寒い…骨まで凍える…って、骨しかないから全身凍えてます！ヨホホ！',
      usopp: '俺は北極で修行したことがあるから雪なんて平気だぜ！…嘘だけど。',
      ace: '雪か。俺の火で溶かしてやろうか？はは。',
    },
  },
  {
    id: 'summer-heat',
    name: '猛暑',
    nameEn: 'Summer Heat',
    dateRange: [{ month: 7, day: 15 }, { month: 8, day: 31 }],
    category: 'weather',
    promptContext: '真夏の暑い時期です。暑さ対策、冷たい食べ物、水分補給の話題が自然です。',
    characterReactions: {
      luffy: 'あっつー！アイス食いてぇ！かき氷！すいか！',
      zoro: '暑さなど精神力で乗り越える。',
      nami: '暑い…日焼け対策しっかりしないと。紫外線は天敵よ！',
      sanji: 'かき氷にフルーツソースを手作りで…レディたちに涼を…！',
      chopper: '暑い！溶ける！僕の毛皮で暑さ倍増だよ…水分補給忘れないでね！',
      robin: '打ち水は江戸時代からの暑さ対策ね。気化熱で2〜3度下がるわ。',
      franky: '冷却システム全開！SUPER COOL MODE！コーラは冷やして飲むのが最高！',
      brook: '暑い…でも骨には汗腺がないので汗はかきません。ヨホホ…涼しい？',
      usopp: '俺が発明した扇風機は風速100メートル！…まだ設計段階だけど。',
      ace: '暑い？俺は火だからいつも暑いぜ。はは。慣れた慣れた。',
    },
  },
  {
    id: 'aki-no-hajimari',
    name: '秋の訪れ',
    nameEn: 'Beginning of Autumn',
    dateRange: [{ month: 9, day: 1 }, { month: 9, day: 30 }],
    category: 'season',
    promptContext: '秋の始まりです。涼しくなる気候、読書の秋、食欲の秋、スポーツの秋の話題が自然です。',
    characterReactions: {
      luffy: '秋だ！食欲の秋！栗！さつまいも！さんま！全部食う！',
      zoro: 'いい季節だ。修行に集中できる。',
      nami: '涼しくなってきたわね。秋服の準備しなきゃ。',
      sanji: '秋の味覚でフルコースだ！旬の食材は最高だぜ！',
      chopper: '読書の秋！医学書を読もう！…あと絵本も！',
      robin: '読書の秋…今年はどの遺跡の研究書を読もうかしら。',
      franky: 'スポーツの秋！SUPERに体を動かすぜ！',
      brook: '芸術の秋…新曲を作りましょう！ヨホホ♪',
      usopp: '芸術の秋！俺の絵は美術館レベルだからな！',
      ace: '秋はいいな。暑くもなく寒くもなく。昼寝日和だ。…zzz',
    },
  },
];

// ── Helper Functions ─────────────────────────────────────────

/**
 * JSTの現在日付を取得
 */
function getJSTNow(): { month: number; day: number } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { month: jst.getUTCMonth() + 1, day: jst.getUTCDate() };
}

/**
 * 日付がイベントの範囲内かチェック（年をまたぐケースにも対応）
 */
function isDateInRange(
  date: { month: number; day: number },
  range: { month: number; day: number }[]
): boolean {
  if (range.length < 2) return false;
  const [start, end] = range;

  const toNum = (d: { month: number; day: number }) => d.month * 100 + d.day;
  const dateNum = toNum(date);
  const startNum = toNum(start);
  const endNum = toNum(end);

  // 年をまたぐ場合（例: 12/31 - 1/1）
  if (startNum > endNum) {
    return dateNum >= startNum || dateNum <= endNum;
  }
  return dateNum >= startNum && dateNum <= endNum;
}

// ── Exported Functions ───────────────────────────────────────

/**
 * 現在のJST日時に該当する全イベントを返す
 */
export function getCurrentSeasonalEvents(): SeasonalEvent[] {
  const now = getJSTNow();
  return SEASONAL_EVENTS.filter((e) => isDateInRange(now, e.dateRange));
}

/**
 * 特定日付に該当するイベントを返す（テスト用）
 */
export function getSeasonalEventsForDate(month: number, day: number): SeasonalEvent[] {
  const date = { month, day };
  return SEASONAL_EVENTS.filter((e) => isDateInRange(date, e.dateRange));
}

/**
 * キャラslugに応じた季節プロンプトコンテキストを生成
 * prompt-builder.tsで呼び出してシステムプロンプトに注入する
 */
export function getSeasonalPromptContext(characterSlug: string): string {
  const events = getCurrentSeasonalEvents();
  if (events.length === 0) return '';

  const parts: string[] = ['## 季節・イベントコンテキスト（自然に会話に織り込むこと）'];

  for (const event of events) {
    parts.push(`\n### ${event.name}（${event.nameEn}）`);
    parts.push(event.promptContext);

    // キャラ固有リアクション or generic fallback
    const reaction = event.characterReactions[characterSlug];
    if (reaction) {
      parts.push(`あなたならこう反応する: 「${reaction}」（参考。そのままコピーせず自然にアレンジすること）`);
    } else {
      parts.push(generic(event.name));
    }
  }

  return parts.join('\n');
}
