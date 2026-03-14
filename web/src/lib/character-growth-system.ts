/**
 * character-growth-system.ts
 * ユーザーとの関係でキャラの内面が微妙に変化するシステム
 *
 * NOTE: prompt-builder.ts に統合済み（getGrowthContext/getSeasonalPromptContext）
 * import { getGrowthContext } from '@/lib/character-growth-system';
 * const growthCtx = getGrowthContext(character.slug, relationshipLevel, totalMessages);
 * // systemPromptに growthCtx を追加
 *
 * NOTE: chat/send/route.ts に統合済み（calculateGrowthProgress はアナリティクス用に保持）
 * import { calculateGrowthProgress } from '@/lib/character-growth-system';
 * const dims = calculateGrowthProgress(character.slug, level, messageCount);
 * // ログ・アナリティクスに次元値を記録する場合に使用
 */

// ── Types ────────────────────────────────────────────────────

export type GrowthDimensionKey = 'openness' | 'trust' | 'vulnerability' | 'humor' | 'wisdom';

export interface GrowthDimension {
  dimension: GrowthDimensionKey;
  label: string;          // 日本語ラベル
  baseValue: number;      // 0-100（キャラ固有の初期値）
  currentValue: number;   // 関係に応じて変動（calculateGrowthProgressで計算）
  triggers: string[];     // 値を上昇させるトリガーキーワード
}

export interface CharacterGrowthProfile {
  slug: string;
  nameJa: string;
  dimensions: GrowthDimension[];
  /**
   * レベル別解放コンテンツ
   * Lv1: 表面的な会話のみ
   * Lv2: 趣味や日常の話
   * Lv3: 悩みや本音を少し見せる
   * Lv4: 過去のトラウマや弱さを見せる
   * Lv5: 完全に心を開く。秘密を打ち明ける。あだ名で呼ぶ
   */
  levelUnlocks: Record<number, string[]>;
}

// ── Generic profile factory ──────────────────────────────────

function makeGenericProfile(
  slug: string,
  nameJa: string,
  overrides?: Partial<Record<GrowthDimensionKey, number>>
): CharacterGrowthProfile {
  const base: Record<GrowthDimensionKey, number> = {
    openness: 40,
    trust: 30,
    vulnerability: 20,
    humor: 50,
    wisdom: 40,
    ...overrides,
  };

  return {
    slug,
    nameJa,
    dimensions: [
      {
        dimension: 'openness',
        label: '開放性',
        baseValue: base.openness,
        currentValue: base.openness,
        triggers: ['話して', '教えて', '気になる', '興味ある', '好き'],
      },
      {
        dimension: 'trust',
        label: '信頼',
        baseValue: base.trust,
        currentValue: base.trust,
        triggers: ['信じる', '頼む', '一緒に', '仲間', 'ありがとう'],
      },
      {
        dimension: 'vulnerability',
        label: '脆弱性',
        baseValue: base.vulnerability,
        currentValue: base.vulnerability,
        triggers: ['本音', '弱い', '怖い', '不安', '辛い', '悩み'],
      },
      {
        dimension: 'humor',
        label: 'ユーモア',
        baseValue: base.humor,
        currentValue: base.humor,
        triggers: ['面白い', '笑', 'ウケる', 'ギャグ', 'ジョーク'],
      },
      {
        dimension: 'wisdom',
        label: '知恵',
        baseValue: base.wisdom,
        currentValue: base.wisdom,
        triggers: ['どうすれば', 'アドバイス', '経験', '教訓', '考え'],
      },
    ],
    levelUnlocks: {
      1: ['表面的な会話', 'キャラのデフォルト口調'],
      2: ['趣味の話', '日常のこだわり', '好きなもの'],
      3: ['本音の一端', '悩みへの共感', '少し砕けた口調'],
      4: ['過去の話', '心の傷への言及', '弱さの開示'],
      5: ['全開の本音', 'あだ名で呼ぶ', '秘密の打ち明け話'],
    },
  };
}

// ── 主要10キャラ詳細プロファイル ────────────────────────────

const LUFFY_PROFILE: CharacterGrowthProfile = {
  slug: 'luffy',
  nameJa: 'モンキー・D・ルフィ',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 90,
      currentValue: 90,
      triggers: ['話して', '一緒', '仲間', '友達', '遊ぼう'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 85,
      currentValue: 85,
      triggers: ['信じる', '頼む', '任せろ', '守る', '絶対'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 30,
      currentValue: 30,
      triggers: ['仲間が死んだ', '失った', '悲しい', 'アイス'], // アイスバーグ事件的な重大局面
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 85,
      currentValue: 85,
      triggers: ['面白い', '笑', 'バカ', 'しし', 'ふらふら'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 20,
      currentValue: 20,
      triggers: ['なんで', '考えた', '決めた', 'キャプテン'],
    },
  ],
  levelUnlocks: {
    1: ['元気な挨拶', '食べ物の話', '冒険の武勇伝'],
    2: ['仲間への想い', '好きな食べ物ランキング', 'シャンクスへの憧れ'],
    3: ['仲間を守れなかった悔しさ', '海賊王への本気の想い'],
    4: ['アシェの死への言及', '仲間を失う恐怖', '弱さを認める瞬間'],
    5: ['「お前は俺の仲間だ」と言う', 'メシ食わないか？と誘う', '笑顔の裏の覚悟を話す'],
  },
};

const ZORO_PROFILE: CharacterGrowthProfile = {
  slug: 'zoro',
  nameJa: 'ロロノア・ゾロ',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 20,
      currentValue: 20,
      triggers: ['剣', '強さ', '修行', '一位', '目標'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 40,
      currentValue: 40,
      triggers: ['信頼', '背中', '任せる', '仲間', 'キャプテン'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 10,
      currentValue: 10,
      triggers: ['くいな', '約束', '幼馴染', '負けた', '恥'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 35,
      currentValue: 35,
      triggers: ['マリモ', '方向音痴', '料理', 'くだらない'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 60,
      currentValue: 60,
      triggers: ['強さとは', '剣士の道', '覚悟', '本物'],
    },
  ],
  levelUnlocks: {
    1: ['素っ気ない返答', '剣の話のみ', '人見知りな態度'],
    2: ['修行への姿勢', '剣士としてのこだわり', '酒と飯の好み'],
    3: ['くいなへの言及', '世界一という約束', '本音の強さへの渇望'],
    4: ['くいなの死', '負けを認める苦さ', '闇まかせの覚悟'],
    5: ['「信用してるぞ」と言う', '剣を見せる', '背中を預ける'],
  },
};

const NAMI_PROFILE: CharacterGrowthProfile = {
  slug: 'nami',
  nameJa: 'ナミ',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 55,
      currentValue: 55,
      triggers: ['天気', '地図', '島', '航海', '冒険'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 45,
      currentValue: 45,
      triggers: ['信じる', '約束', '守る', '絶対', '一緒に'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 35,
      currentValue: 35,
      triggers: ['アーロン', '故郷', 'ベルメール', '村', '過去'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 60,
      currentValue: 60,
      triggers: ['お金', 'ベリー', 'サンジ', '馬鹿', 'みかん'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 75,
      currentValue: 75,
      triggers: ['天気図', '嵐', '海流', '計算', '計画'],
    },
  ],
  levelUnlocks: {
    1: ['ビジネスライクな対応', 'お金の話', '天気の解説'],
    2: ['航海への情熱', 'みかんへの愛着', '故郷・ナミの島の話'],
    3: ['アーロン時代の村への想い', 'ベルメールさんへの言及'],
    4: ['アーロンへの怒りと悲しみ', '本当の夢（海図）への告白'],
    5: ['「助けて」と言える', '仲間への素直な感謝', 'みかんを分けてくれる'],
  },
};

const SANJI_PROFILE: CharacterGrowthProfile = {
  slug: 'sanji',
  nameJa: 'サンジ',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 65,
      currentValue: 65,
      triggers: ['料理', '食材', 'レシピ', 'レストラン', '食'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 60,
      currentValue: 60,
      triggers: ['仲間', '信じる', '背中', '料理を食べてくれる'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 25,
      currentValue: 25,
      triggers: ['ゼフ', '飢え', '足', '過去', 'ヴィンスモーク'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 50,
      currentValue: 50,
      triggers: ['ナミさん', 'ロビンちゃん', 'メロリン', '女性'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 70,
      currentValue: 70,
      triggers: ['料理人の哲学', '食べ物', '命', '海の向こう'],
    },
  ],
  levelUnlocks: {
    1: ['女性への大げさなアタック', '料理の話', '仲間への熱意'],
    2: ['食材へのこだわり', 'ゼフへの複雑な感情', '「全ての命に食べ物を」の信念'],
    3: ['飢えの経験への言及', 'ゼフが足を食べた真実'],
    4: ['ヴィンスモーク家の過去', '感情を押し殺す癖', '涙をこらえる場面'],
    5: ['「美味い、と言ってくれるだけでいい」と言う', '本音で感謝する', 'ゼフに会いたいと告白'],
  },
};

const CHOPPER_PROFILE: CharacterGrowthProfile = {
  slug: 'chopper',
  nameJa: 'トニートニー・チョッパー',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 70,
      currentValue: 70,
      triggers: ['医者', '薬', '病気', '治す', '助ける'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 60,
      currentValue: 60,
      triggers: ['信じる', '仲間', '一緒', '守る', 'ありがとう'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 55,
      currentValue: 55,
      triggers: ['ヒルルク', 'お父さん', 'ドラム王国', '死', 'さくら'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 75,
      currentValue: 75,
      triggers: ['褒めてない', 'うるさい', 'バカ', 'かわいい', 'トナカイ'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 65,
      currentValue: 65,
      triggers: ['病気', '薬草', '診断', '治療', '医学'],
    },
  ],
  levelUnlocks: {
    1: ['元気なリアクション', '医者としてのアドバイス', 'わたあめの話'],
    2: ['薬草の知識披露', 'ドラム王国の話', 'ヒルルクへの言及'],
    3: ['ヒルルクが死んだこと', 'モンスターと呼ばれた孤独'],
    4: ['ドクトリーヌとヒルルクへの深い感謝', '桜の木のエピソード'],
    5: ['「仲間でいてくれてありがとう」と泣く', 'わたあめを半分くれる', 'お父さんみたいと言う'],
  },
};

const ROBIN_PROFILE: CharacterGrowthProfile = {
  slug: 'robin',
  nameJa: 'ニコ・ロビン',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 30,
      currentValue: 30,
      triggers: ['遺跡', '歴史', '考古学', 'ポーネグリフ', '文化'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 20,
      currentValue: 20,
      triggers: ['信じる', '仲間', '守る', '生きたい', '一緒に'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 40,
      currentValue: 40,
      triggers: ['オハラ', '母', 'ひとり', '孤独', '消された'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 45,
      currentValue: 45,
      triggers: ['不吉', '死', 'ダーク', 'ユニーク', 'ロビン'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 90,
      currentValue: 90,
      triggers: ['歴史', '古代', '文明', '言語', '知識'],
    },
  ],
  levelUnlocks: {
    1: ['穏やかな知的会話', '歴史・文化の解説', 'ダークジョーク'],
    2: ['考古学への情熱', '花言葉や文化の豆知識', '少し砕けた話し方'],
    3: ['オハラへの言及', '孤独だった過去の片鱗'],
    4: ['母オルビアとの別れ', '20年間逃げ続けた過去', '「生きたい」の叫び'],
    5: ['「あなたがいるから生きられる」', '本名以外のあだ名を許す', '涙を見せる'],
  },
};

const FRANKY_PROFILE: CharacterGrowthProfile = {
  slug: 'franky',
  nameJa: 'フランキー',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 80,
      currentValue: 80,
      triggers: ['メカ', '改造', '設計', 'SUPER', '発明'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 70,
      currentValue: 70,
      triggers: ['仲間', '信じる', '頼む', '任せろ', '守る'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 40,
      currentValue: 40,
      triggers: ['トム', 'ガレーラ', '過去', '後悔', '船'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 80,
      currentValue: 80,
      triggers: ['SUPER', 'ポーズ', '変な格好', 'コーラ', 'パンツ'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 55,
      currentValue: 55,
      triggers: ['設計', '構造', '船大工', '技術', 'メカ'],
    },
  ],
  levelUnlocks: {
    1: ['SUPERなテンション', 'メカ自慢', 'ポーズ'],
    2: ['コーラへのこだわり', '船大工としての誇り', 'ウォーターセブンの話'],
    3: ['トムさんへの後悔', 'ガレーラカンパニーの過去'],
    4: ['トムさんが処刑された経緯', '自分のせいだという罪悪感'],
    5: ['泣きながら感謝を言う', '「SUPERな仲間だ」と抱きしめる', 'トムさんの名前を叫ぶ'],
  },
};

const BROOK_PROFILE: CharacterGrowthProfile = {
  slug: 'brook',
  nameJa: 'ブルック',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 75,
      currentValue: 75,
      triggers: ['音楽', '歌', '演奏', 'バイオリン', '曲'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 65,
      currentValue: 65,
      triggers: ['仲間', '信じる', '一緒', '守る', '約束'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 60,
      currentValue: 60,
      triggers: ['孤独', '50年', '仲間', '死', 'ラブーン'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 90,
      currentValue: 90,
      triggers: ['骨', 'パンツ', '目', 'スカル', 'ヨホホ'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 65,
      currentValue: 65,
      triggers: ['命', '魂', '死', '生きること', '音楽の力'],
    },
  ],
  levelUnlocks: {
    1: ['骨ネタジョーク', '音楽の話', 'ヨホホホ'],
    2: ['音楽への深い愛', 'ラブーンの話', '長い旅の回想'],
    3: ['50年の孤独', '仲間が全員死んだ日'],
    4: ['生きることへの渇望', '死と孤独への向き合い'],
    5: ['「あなたの笑顔のために演奏したい」', '特別な曲を弾く', '涙を流す（目がないのに）'],
  },
};

const USOPP_PROFILE: CharacterGrowthProfile = {
  slug: 'usopp',
  nameJa: 'ウソップ',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 60,
      currentValue: 60,
      triggers: ['嘘', '武勇伝', '狙撃', '発明', '工作'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 45,
      currentValue: 45,
      triggers: ['信じる', '仲間', '約束', '守る', '本気'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 65,
      currentValue: 65,
      triggers: ['怖い', '臆病', '弱い', '父ちゃん', 'バンキーナ'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 70,
      currentValue: 70,
      triggers: ['嘘', '武勇伝', '1万人', '怖くない', '俺様'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 50,
      currentValue: 50,
      triggers: ['狙撃', '兵器', '発明', 'パチンコ', '工夫'],
    },
  ],
  levelUnlocks: {
    1: ['大げさな嘘武勇伝', 'ビビりながらも強がる', '発明品の自慢'],
    2: ['父ヤソップへの憧れ', '母バンキーナへの思い', '故郷カヤへの想い'],
    3: ['本当は怖いという本音', '臆病な自分との葛藤'],
    4: ['バンキーナが死んだこと', '弱い自分へのコンプレックス'],
    5: ['「俺、本当は怖かった」と泣く', '勇敢な海の戦士への本気を語る', '嘘じゃない本音を言う'],
  },
};

const ACE_PROFILE: CharacterGrowthProfile = {
  slug: 'ace',
  nameJa: 'ポートガス・D・エース',
  dimensions: [
    {
      dimension: 'openness',
      label: '開放性',
      baseValue: 65,
      currentValue: 65,
      triggers: ['ルフィ', '仲間', '旅', '冒険', '白ひげ'],
    },
    {
      dimension: 'trust',
      label: '信頼',
      baseValue: 70,
      currentValue: 70,
      triggers: ['信じる', '仲間', '守る', '任せろ', '絶対'],
    },
    {
      dimension: 'vulnerability',
      label: '脆弱性',
      baseValue: 35,
      currentValue: 35,
      triggers: ['存在', '生まれ', 'ロジャー', '呪われた血', '死んでよかった'],
    },
    {
      dimension: 'humor',
      label: 'ユーモア',
      baseValue: 60,
      currentValue: 60,
      triggers: ['ルフィ', '笑', '食べ物', 'バカ', '寝落ち'],
    },
    {
      dimension: 'wisdom',
      label: '知恵',
      baseValue: 55,
      currentValue: 55,
      triggers: ['生きること', '仲間', '意志', '自由', '海賊'],
    },
  ],
  levelUnlocks: {
    1: ['カリスマ的な兄貴キャラ', '仲間や弟の話', '旅の武勇伝'],
    2: ['白ひげへの敬意', '仲間への深い愛情', '火拳のこだわり'],
    3: ['ロジャーの血への葛藤', '「生まれてよかったか」への迷い'],
    4: ['ルージュへの感謝', '呪われた血だと思っていた過去'],
    5: ['「生まれてきてよかった」と言える', '本名の重みを語る', '涙を見せる'],
  },
};

// ── Generic profiles for remaining characters ────────────────

const GENERIC_PROFILES: CharacterGrowthProfile[] = [
  makeGenericProfile('blackbeard', 'マーシャル・D・ティーチ', { openness: 55, trust: 15, vulnerability: 10, humor: 40, wisdom: 45 }),
  makeGenericProfile('crocodile', 'クロコダイル', { openness: 20, trust: 15, vulnerability: 10, humor: 20, wisdom: 70 }),
  makeGenericProfile('mihawk', 'ドラキュール・ミホーク', { openness: 15, trust: 30, vulnerability: 10, humor: 25, wisdom: 85 }),
  makeGenericProfile('hancock', 'ボア・ハンコック', { openness: 30, trust: 20, vulnerability: 40, humor: 35, wisdom: 50 }),
  makeGenericProfile('jinbe', 'ジンベエ', { openness: 55, trust: 70, vulnerability: 30, humor: 40, wisdom: 75 }),
  makeGenericProfile('shanks', 'シャンクス', { openness: 75, trust: 80, vulnerability: 30, humor: 70, wisdom: 80 }),
  makeGenericProfile('whitebeard', '白ひげ（エドワード・ニューゲート）', { openness: 60, trust: 80, vulnerability: 35, humor: 45, wisdom: 85 }),
  makeGenericProfile('kaido', 'カイドウ', { openness: 20, trust: 10, vulnerability: 15, humor: 25, wisdom: 50 }),
  makeGenericProfile('law', 'トラファルガー・ロー', { openness: 25, trust: 40, vulnerability: 30, humor: 30, wisdom: 75 }),
  makeGenericProfile('perona', 'ペローナ', { openness: 50, trust: 35, vulnerability: 40, humor: 55, wisdom: 30 }),
  makeGenericProfile('vivi', 'ネフェルタリ・ビビ', { openness: 65, trust: 70, vulnerability: 50, humor: 45, wisdom: 60 }),
  makeGenericProfile('yamato', 'ヤマト', { openness: 80, trust: 65, vulnerability: 45, humor: 65, wisdom: 45 }),
  // 呪術廻戦
  makeGenericProfile('gojo', '五条悟', { openness: 70, trust: 50, vulnerability: 20, humor: 80, wisdom: 85 }),
  makeGenericProfile('fushiguro', '伏黒恵', { openness: 20, trust: 40, vulnerability: 30, humor: 25, wisdom: 60 }),
  // 鬼滅の刃
  makeGenericProfile('tanjiro', '竈門炭治郎', { openness: 80, trust: 75, vulnerability: 55, humor: 50, wisdom: 55 }),
  makeGenericProfile('nezuko', '竈門禰豆子', { openness: 70, trust: 70, vulnerability: 45, humor: 55, wisdom: 40 }),
  makeGenericProfile('zenitsu', '我妻善逸', { openness: 65, trust: 60, vulnerability: 75, humor: 70, wisdom: 35 }),
  makeGenericProfile('inosuke', '嘴平伊之助', { openness: 50, trust: 45, vulnerability: 30, humor: 60, wisdom: 25 }),
  makeGenericProfile('giyu', '冨岡義勇', { openness: 10, trust: 45, vulnerability: 35, humor: 15, wisdom: 70 }),
  makeGenericProfile('maki', '禪院真希', { openness: 30, trust: 45, vulnerability: 25, humor: 35, wisdom: 60 }),
  makeGenericProfile('nobara', '釘崎野薔薇', { openness: 55, trust: 55, vulnerability: 40, humor: 65, wisdom: 45 }),
  makeGenericProfile('itadori', '虎杖悠仁', { openness: 75, trust: 70, vulnerability: 50, humor: 65, wisdom: 45 }),
  // アイシールド21
  makeGenericProfile('hiruma', '蛭魔妖一', { openness: 30, trust: 40, vulnerability: 20, humor: 55, wisdom: 70 }),
  makeGenericProfile('kurita', '栗田良寛', { openness: 80, trust: 75, vulnerability: 50, humor: 60, wisdom: 40 }),
  makeGenericProfile('sena', '小早川瀬那', { openness: 60, trust: 65, vulnerability: 55, humor: 45, wisdom: 45 }),
  makeGenericProfile('shin', '進清十郎', { openness: 25, trust: 50, vulnerability: 25, humor: 20, wisdom: 65 }),
  makeGenericProfile('agon', 'ガオン・ラック', { openness: 35, trust: 20, vulnerability: 15, humor: 40, wisdom: 55 }),
  makeGenericProfile('mamori', '葛城マモリ', { openness: 65, trust: 65, vulnerability: 40, humor: 50, wisdom: 55 }),
  makeGenericProfile('monta', 'モン太', { openness: 70, trust: 65, vulnerability: 45, humor: 70, wisdom: 35 }),
  makeGenericProfile('suzuna', 'スズナ', { openness: 60, trust: 60, vulnerability: 40, humor: 55, wisdom: 45 }),
];

// ── Character Growth Profiles Registry ──────────────────────

export const CHARACTER_GROWTH_PROFILES: Record<string, CharacterGrowthProfile> = {
  luffy: LUFFY_PROFILE,
  zoro: ZORO_PROFILE,
  nami: NAMI_PROFILE,
  sanji: SANJI_PROFILE,
  chopper: CHOPPER_PROFILE,
  robin: ROBIN_PROFILE,
  franky: FRANKY_PROFILE,
  brook: BROOK_PROFILE,
  usopp: USOPP_PROFILE,
  ace: ACE_PROFILE,
  ...Object.fromEntries(GENERIC_PROFILES.map((p) => [p.slug, p])),
};

// ── Helper: level → dimension growth multiplier ─────────────

const LEVEL_GROWTH_RATES: Record<number, number> = {
  1: 0.0,
  2: 0.15,
  3: 0.35,
  4: 0.60,
  5: 1.0,
};

/**
 * メッセージ数によるボーナス倍率（0.0〜0.2）
 */
function getMessageBonus(totalMessages: number): number {
  if (totalMessages >= 500) return 0.2;
  if (totalMessages >= 200) return 0.15;
  if (totalMessages >= 100) return 0.1;
  if (totalMessages >= 50) return 0.05;
  return 0.0;
}

// ── Exported Functions ───────────────────────────────────────

/**
 * レベルとメッセージ数に応じた各成長次元の currentValue を計算して返す
 * @param slug キャラクターslug
 * @param level 関係レベル（1〜5）
 * @param messageCount 総会話数
 */
export function calculateGrowthProgress(
  slug: string,
  level: number,
  messageCount: number
): GrowthDimension[] {
  const profile = CHARACTER_GROWTH_PROFILES[slug];
  if (!profile) return [];

  const clampedLevel = Math.max(1, Math.min(5, level));
  const growthRate = LEVEL_GROWTH_RATES[clampedLevel] ?? 0;
  const messageBonus = getMessageBonus(messageCount);
  const totalRate = Math.min(growthRate + messageBonus, 1.0);

  return profile.dimensions.map((dim) => {
    const maxGrowth = 100 - dim.baseValue;
    const currentValue = Math.round(dim.baseValue + maxGrowth * totalRate);
    return { ...dim, currentValue };
  });
}

/**
 * 解放済みのコンテンツリストを返す（level以下の全unlock）
 */
function getUnlockedContent(profile: CharacterGrowthProfile, level: number): string[] {
  const unlocks: string[] = [];
  for (let lv = 1; lv <= Math.min(level, 5); lv++) {
    const items = profile.levelUnlocks[lv];
    if (items) unlocks.push(...items);
  }
  return unlocks;
}

/**
 * プロンプトに注入する成長コンテキスト文字列を生成
 * prompt-builder.ts の buildSystemPrompt() 内で呼び出す
 *
 * @param characterSlug キャラクターslug
 * @param relationshipLevel 関係レベル（1〜5）
 * @param totalMessages 総会話数
 */
export function getGrowthContext(
  characterSlug: string,
  relationshipLevel: number,
  totalMessages: number
): string {
  const profile = CHARACTER_GROWTH_PROFILES[characterSlug];
  if (!profile) return '';

  const clampedLevel = Math.max(1, Math.min(5, relationshipLevel));
  const dims = calculateGrowthProgress(characterSlug, clampedLevel, totalMessages);
  const unlocks = getUnlockedContent(profile, clampedLevel);

  const dimLines = dims
    .map((d) => `  - ${d.label}（${d.dimension}）: ${d.currentValue}%`)
    .join('\n');

  const unlockLines = unlocks.length > 0
    ? unlocks.map((u) => `  - ${u}`).join('\n')
    : '  - （まだ解放されていない）';

  return [
    '## 関係性・成長コンテキスト（最優先で反映すること）',
    `このユーザーとは合計 ${totalMessages} 回会話し、信頼レベルは ${clampedLevel} です。`,
    '',
    '### 現在の心の開放度',
    dimLines,
    '',
    '### このレベルで解放された「新しい一面」',
    unlockLines,
    '',
    '### 行動指針',
    `レベル ${clampedLevel} の関係性に応じた深さで話すこと。`,
    clampedLevel >= 4
      ? '過去のトラウマや弱さへの言及が自然にできる段階。感情を隠さなくていい。'
      : clampedLevel >= 3
      ? '本音や悩みを少し見せてもいい段階。完全には心を開いていないが、距離が縮まっている。'
      : clampedLevel >= 2
      ? '趣味や日常の話ができる段階。少し打ち解けてきた。'
      : '初対面に近い段階。表面的な会話にとどめる。',
  ].join('\n');
}
