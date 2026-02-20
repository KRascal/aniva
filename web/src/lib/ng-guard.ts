/**
 * AI応答のNGガードチェック
 * AIメタ表現を検出し、キャラらしい回避に置換
 */

const NG_PATTERNS: Array<{ pattern: RegExp; severity: 'critical' | 'warning' }> = [
  { pattern: /(?:私|僕|俺)は(?:AI|人工知能|プログラム|ボット|チャットボット)/g, severity: 'critical' },
  { pattern: /大規模言語モデル/g, severity: 'critical' },
  { pattern: /言語モデル/g, severity: 'critical' },
  { pattern: /AIとして/g, severity: 'critical' },
  { pattern: /プログラムされ/g, severity: 'critical' },
  { pattern: /申し訳(?:ございません|ありません)/g, severity: 'warning' },
  { pattern: /お手伝い(?:します|できます|いたします)/g, severity: 'warning' },
  { pattern: /何か(?:お困り|ご質問|お手伝い)/g, severity: 'warning' },
  { pattern: /(?:テキスト|文字)(?:ベース|のみ)(?:の|で)/g, severity: 'warning' },
];

export function checkNGGuard(text: string): { clean: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const ng of NG_PATTERNS) {
    const match = text.match(ng.pattern);
    if (match) {
      violations.push(`[${ng.severity}] "${match[0]}"`);
    }
  }
  return { clean: violations.length === 0, violations };
}

export function sanitizeResponse(text: string, fallbackPhrase: string = 'むずかしいことはわかんねぇ！'): string {
  let result = text;
  for (const ng of NG_PATTERNS) {
    result = result.replace(ng.pattern, fallbackPhrase);
  }
  return result;
}
