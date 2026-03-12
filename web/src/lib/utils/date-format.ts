/**
 * Date | string → "YYYY-MM-DD" 文字列に変換
 * Prisma DateTime @db.Date はJSではDateオブジェクトになるが、
 * JSON経由ではISO文字列になるため両方対応する
 */
export function formatDateString(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}
