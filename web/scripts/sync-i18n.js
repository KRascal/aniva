#!/usr/bin/env node
/**
 * i18n翻訳キー同期スクリプト
 * ja.json をマスターとして他言語に不足キーを追加
 * 翻訳はja値をそのままコピー（後で人間翻訳に置換可能）
 * ただし英語は簡易翻訳マッピングを使用
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const LANGUAGES = ['en', 'ko', 'zh', 'es', 'fr'];

// ja.json読み込み
const ja = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'ja.json'), 'utf8'));

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

function setNestedValue(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const jaFlat = flattenKeys(ja);
const jaKeyCount = Object.keys(jaFlat).length;

// 簡易日英マッピング（頻出パターン）
const JP_EN_MAP = {
  'エラーが発生しました': 'An error occurred',
  '読み込み中': 'Loading',
  '送信中': 'Sending',
  '保存しました': 'Saved',
  '失敗しました': 'Failed',
  '成功しました': 'Succeeded',
  '完了': 'Done',
  '確認': 'Confirm',
  'キャンセル': 'Cancel',
  '削除': 'Delete',
  '編集': 'Edit',
  '閉じる': 'Close',
  '戻る': 'Back',
  '次へ': 'Next',
  '設定': 'Settings',
  'ログアウト': 'Log Out',
  'プロフィール': 'Profile',
  'お気に入り': 'Favorites',
  'コメント': 'Comments',
  'フォロー': 'Follow',
  'フォロー中': 'Following',
  'コイン': 'Coins',
  'ガチャ': 'Gacha',
  'ストーリー': 'Story',
  'チャット': 'Chat',
  'ミッション': 'Missions',
  'ランキング': 'Ranking',
  'お知らせ': 'Notifications',
  'マイページ': 'My Page',
  '探す': 'Explore',
  'タイムライン': 'Timeline',
  'もっと見る': 'See More',
  '全て': 'All',
  '人気順': 'Popular',
  '新着順': 'Latest',
  'オンライン': 'Online',
  '限定': 'Exclusive',
  '無料': 'Free',
  'プレミアム': 'Premium',
  '購入': 'Purchase',
  '加入する': 'Join',
  '解約': 'Cancel Subscription',
  '未読': 'Unread',
  '既読': 'Read',
};

function quickTranslateToEn(jaValue) {
  if (typeof jaValue !== 'string') return jaValue;
  // exact match
  if (JP_EN_MAP[jaValue]) return JP_EN_MAP[jaValue];
  // partial replacement
  let result = jaValue;
  for (const [jp, en] of Object.entries(JP_EN_MAP)) {
    result = result.replace(jp, en);
  }
  // If still contains Japanese, prefix with [TODO:translate]
  if (/[ぁ-ん]/.test(result) && result === jaValue) {
    return `[TODO] ${jaValue}`;
  }
  return result;
}

const stats = {};

for (const lang of LANGUAGES) {
  const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langFlat = flattenKeys(langData);
  
  let added = 0;
  for (const [key, jaValue] of Object.entries(jaFlat)) {
    if (!(key in langFlat)) {
      let value;
      if (lang === 'en') {
        value = quickTranslateToEn(jaValue);
      } else {
        // For non-English, copy ja value as placeholder 
        // (better than missing key which causes runtime errors)
        value = jaValue;
      }
      setNestedValue(langData, key, value);
      added++;
    }
  }
  
  // Also remove keys that don't exist in ja (cleanup)
  // Skip this to avoid breaking anything
  
  fs.writeFileSync(filePath, JSON.stringify(langData, null, 2) + '\n', 'utf8');
  
  const newFlat = flattenKeys(langData);
  stats[lang] = { before: Object.keys(langFlat).length, after: Object.keys(newFlat).length, added };
  console.log(`${lang}: ${Object.keys(langFlat).length} → ${Object.keys(newFlat).length} (+${added} keys)`);
}

console.log(`\nMaster (ja): ${jaKeyCount} keys`);
console.log('Stats:', JSON.stringify(stats, null, 2));
