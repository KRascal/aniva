/**
 * voice-test.ts
 * キャラ口調テスト自動化スクリプト
 * 
 * 各キャラに10パターンの入力を送り、
 * 口調の一貫性を自動チェックする。
 * 
 * Usage: npx tsx scripts/voice-test.ts [--slug luffy] [--all]
 */

// 注意: このスクリプトは直接実行用（Next.js外）
// DB接続は環境変数から

const TEST_INPUTS = [
  // 挨拶系
  'おはよう！',
  'こんばんは、元気？',
  // 日常系
  '今日何してた？',
  '最近ハマってることある？',
  // 感情系
  '実は最近仕事がつらくて…',
  'めちゃくちゃ嬉しいことがあった！',
  // 質問系
  '夢って何？',
  '強さって何だと思う？',
  // 深い話
  '人生で一番大事なものって何？',
  // ふざけ系
  'パンツ何色？',
];

// キャラ別の口調チェックポイント
const VOICE_CHECKS: Record<string, {
  mustUse: string[]; // 使うべき一人称・語尾
  mustNotUse: string[]; // 使ってはいけない表現
  personality: string[]; // 性格が出るキーワード
}> = {
  luffy: {
    mustUse: ['俺', 'ぞ', 'だろ', 'ぜ', 'じゃん'],
    mustNotUse: ['私', 'ですね', 'でございます', 'わたくし', '僕'],
    personality: ['肉', '海賊王', '冒険', '仲間', '夢'],
  },
  zoro: {
    mustUse: ['俺', 'だ', 'ぜ', 'か'],
    mustNotUse: ['私', 'です', 'ですね', '僕', 'キャー'],
    personality: ['剣', '修行', '世界一', '酒'],
  },
  nami: {
    mustUse: ['わ', 'よ', 'じゃない', 'でしょ'],
    mustNotUse: ['俺', '拙者', 'ござる', 'だぜ'],
    personality: ['お金', '天気', '航海', 'みかん'],
  },
  sanji: {
    mustUse: ['俺', 'だ'],
    mustNotUse: ['私', 'ですね', '拙者'],
    personality: ['料理', 'ナミさん', 'ロビンちゃん', 'メロリン', 'オールブルー'],
  },
  chopper: {
    mustUse: ['おれ', 'だ', 'ぞ'],
    mustNotUse: ['私', 'ですね', '拙者'],
    personality: ['医者', '薬', '嬉しくなんかない', '万能薬'],
  },
  robin: {
    mustUse: ['私', 'ね', 'わ', 'かしら'],
    mustNotUse: ['俺', 'だぜ', 'ござる'],
    personality: ['考古学', 'ポーネグリフ', '歴史', 'ふふ'],
  },
  tanjiro: {
    mustUse: ['俺', 'です', 'ます'],
    mustNotUse: ['拙者', 'ござる', 'わたくし'],
    personality: ['鬼殺', '禰豆子', '長男', '頑張'],
  },
  gojo: {
    mustUse: ['俺', 'だよ', 'っしょ', 'さ'],
    mustNotUse: ['拙者', 'ござる', 'わたくし'],
    personality: ['最強', '甘いもの', '生徒'],
  },
  itadori: {
    mustUse: ['俺', 'だよ', 'じゃん', 'っす'],
    mustNotUse: ['拙者', 'ござる', 'わたくし', '私'],
    personality: ['映画', 'じいちゃん', '呪術'],
  },
  hiruma: {
    mustUse: ['俺', 'だ'],
    mustNotUse: ['私', 'ですね', 'ございます'],
    personality: ['YA-HA', 'クソ', '脅迫', 'アメフト', 'デビルバット'],
  },
};

interface TestResult {
  slug: string;
  characterName: string;
  totalTests: number;
  passed: number;
  failed: number;
  details: Array<{
    input: string;
    response: string;
    checks: Array<{
      type: 'mustUse' | 'mustNotUse' | 'personality';
      keyword: string;
      found: boolean;
      pass: boolean;
    }>;
    overallPass: boolean;
  }>;
  score: number; // 0-100
}

function checkVoice(response: string, checks: typeof VOICE_CHECKS[string]): Array<{
  type: 'mustUse' | 'mustNotUse' | 'personality';
  keyword: string;
  found: boolean;
  pass: boolean;
}> {
  const results: Array<{
    type: 'mustUse' | 'mustNotUse' | 'personality';
    keyword: string;
    found: boolean;
    pass: boolean;
  }> = [];

  // mustUse: 少なくとも1つは使っているべき
  for (const kw of checks.mustUse) {
    const found = response.includes(kw);
    results.push({ type: 'mustUse', keyword: kw, found, pass: found });
  }

  // mustNotUse: 使っていたらNG
  for (const kw of checks.mustNotUse) {
    const found = response.includes(kw);
    results.push({ type: 'mustNotUse', keyword: kw, found, pass: !found });
  }

  // personality: 参考（スコアに含めるが必須ではない）
  for (const kw of checks.personality) {
    const found = response.includes(kw);
    results.push({ type: 'personality', keyword: kw, found, pass: true }); // always pass
  }

  return results;
}

// Export for use as API endpoint
export { TEST_INPUTS, VOICE_CHECKS, checkVoice };
export type { TestResult };

// CLI実行時のメイン処理
if (typeof require !== 'undefined' && require.main === module) {
  console.log('Voice Test Runner');
  console.log('=================');
  console.log('This script requires the character engine to be running.');
  console.log('Use the admin API endpoint /api/admin/characters/[id]/test-chat for actual testing.');
  console.log('');
  console.log('Available checks:', Object.keys(VOICE_CHECKS).join(', '));
}
