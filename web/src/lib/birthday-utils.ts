/** 誕生日が今日から daysAhead 日以内かチェック (MM-DD or M/D 形式対応) */
export function getBirthdayCountdown(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const normalized = birthday.includes('/') ? birthday.replace('/', '-').padStart(5, '0') : birthday;
  const [mm, dd] = normalized.split('-').map(Number);
  if (!mm || !dd) return null;
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  let bday = new Date(Date.UTC(year, mm - 1, dd));
  if (bday < jstNow) bday = new Date(Date.UTC(year + 1, mm - 1, dd));
  const diffMs = bday.getTime() - jstNow.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? diffDays : null;
}
