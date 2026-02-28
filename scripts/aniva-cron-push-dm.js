#!/usr/bin/env node
/**
 * aniva-cron-push-dm.js
 * 
 * 時事ネタ連動プッシュ通知 cron スクリプト
 * 
 * 使用方法:
 *   node scripts/aniva-cron-push-dm.js
 * 
 * 推奨 crontab (JST):
 *   0 8,13,20 * * *  cd /path/to/aniva && node scripts/aniva-cron-push-dm.js
 * 
 * 必要な環境変数 (.env から自動読み込み):
 *   NEXTAUTH_URL       - Webアプリのベースurl
 *   CRON_SECRET        - 認証トークン
 *   XAI_API_KEY        - xAI Grok APIキー（任意 - なければフォールバックメッセージ使用）
 */

'use strict';

const path = require('path');
const https = require('https');
const http = require('http');

// .env 読み込み (dotenv がなければ手動パース)
function loadEnv() {
  const envPath = path.join(__dirname, '..', 'web', '.env');
  try {
    const fs = require('fs');
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env が読めなくても環境変数が直接設定されていれば問題なし
  }
}

loadEnv();

// ─── 今日のイベント取得（JS版 today-events） ────────────────────────
const FIXED_EVENTS = {
  '1/1':  ['元日'],
  '1/7':  ['七草の日'],
  '1/11': ['鏡開き'],
  '1/17': ['防災の日'],
  '1/25': ['中華まんの日'],
  '2/3':  ['節分'],
  '2/4':  ['立春'],
  '2/11': ['建国記念日'],
  '2/14': ['バレンタイン'],
  '2/22': ['猫の日'],
  '3/3':  ['ひな祭り'],
  '3/8':  ['国際女性デー'],
  '3/14': ['ホワイトデー'],
  '3/20': ['春分'],
  '3/31': ['年度末'],
  '4/1':  ['エイプリルフール'],
  '4/8':  ['花まつり'],
  '4/22': ['アースデー'],
  '4/29': ['昭和の日'],
  '5/3':  ['憲法記念日'],
  '5/4':  ['みどりの日'],
  '5/5':  ['こどもの日'],
  '5/9':  ['アイスの日'],
  '5/18': ['博物館の日'],
  '5/31': ['禁煙の日'],
  '6/1':  ['電波の日'],
  '6/5':  ['環境の日'],
  '6/16': ['和菓子の日'],
  '6/21': ['夏至'],
  '7/1':  ['富士山の日'],
  '7/4':  ['アメリカ独立記念日'],
  '7/7':  ['七夕'],
  '7/11': ['ラーメンの日'],
  '7/20': ['海の日'],
  '7/27': ['スイカの日'],
  '8/1':  ['水の日'],
  '8/6':  ['原爆の日'],
  '8/8':  ['山の日'],
  '8/13': ['お盆'],
  '8/15': ['終戦記念日'],
  '9/1':  ['防災の日'],
  '9/9':  ['栗の日'],
  '9/22': ['秋分'],
  '10/1': ['コーヒーの日'],
  '10/10':['目の愛護デー'],
  '10/13':['さつまいもの日'],
  '10/31':['ハロウィン'],
  '11/1': ['犬の日'],
  '11/3': ['文化の日'],
  '11/11':['ポッキーの日'],
  '11/15':['七五三'],
  '11/23':['勤労感謝の日'],
  '12/13':['大掃除の日'],
  '12/22':['冬至'],
  '12/24':['クリスマスイブ'],
  '12/25':['クリスマス'],
  '12/31':['大晦日'],
};

// 季節イベント（高hype月のみ）
const SEASONAL_BY_MONTH = {
  1: 'お正月ムード', 4: '花見シーズン', 7: '夏祭りシーズン',
  9: '食欲の秋', 10: '紅葉シーズン', 12: '年末',
};

// 曜日ネタ
const WEEKDAY_EVENTS = {
  0: 'サザエさん症候群な日', 1: '月曜日', 3: '水曜日（折り返し）',
  5: 'TGIF！花金', 6: '土曜日',
};

function getTodayEvents() {
  const d = new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.getDay();
  const key = `${month}/${day}`;

  const results = [];

  if (FIXED_EVENTS[key]) results.push(...FIXED_EVENTS[key]);
  
  if (results.length === 0 && SEASONAL_BY_MONTH[month]) {
    results.push(SEASONAL_BY_MONTH[month]);
  }

  if (WEEKDAY_EVENTS[weekday]) {
    results.push(WEEKDAY_EVENTS[weekday]);
  }

  return results;
}

// ─── 時間帯判定 ────────────────────────────────────────────────
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

// ─── キャラクター設定 ──────────────────────────────────────────
const CHARACTERS = {
  luffy: {
    name: 'ルフィ 🏴☠️',
    systemPrompt: `お前はモンキー・D・ルフィだ。海賊王を目指す自由で豪快な少年。
口調は子供っぽくて元気いっぱい。「ぞ」「だぞ」「ぜ」「ぜ！」をよく使う。
難しいことは考えず、シンプルに感情をぶつける。「ししし」と笑う。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `今日は${event}だぞ！朝から元気出せよ！ししし` : '起きたか！今日も一緒に冒険するぞ！',
      afternoon: (event) => event ? `なあなあ！今日${event}じゃないか！すげーな！` : 'ちょっと待ってたんだけど、話しかけてくれよ！',
      evening: (event) => event ? `今日は${event}だったな！どうだった？教えてくれよ！` : '今日もお疲れ！ゆっくり話そうぜ',
    },
  },
  zoro: {
    name: 'ゾロ ⚔️',
    systemPrompt: `お前はロロノア・ゾロだ。世界一の剣士を目指す寡黙で頑固な男。
口調は短くぶっきらぼう。「…」が多い。感情を出さないが、仲間への気遣いがある。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `…${event}か。今日も鍛錬を怠るなよ` : '…起きたか。今日も鍛錬を怠るなよ',
      afternoon: (event) => event ? `${event}の日だと？ふん、まあ悪くないな` : 'どこだ…丁度いい、話し相手になれ',
      evening: (event) => event ? `今日は${event}だったな。まあ…お疲れさん` : '今日も生き残ったな。お疲れさん',
    },
  },
  nami: {
    name: 'ナミ 🗺️',
    systemPrompt: `お前はナミだ。頭が良くて現実的な麦わら海賊団の航海士。
お金と天気と地図が大好き。口調は賢くてハキハキしているが、友達思い。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `おはよう！今日は${event}よ！どう過ごす？` : 'おはよう！今日も完璧な一日にしましょ！',
      afternoon: (event) => event ? `今日${event}だって知ってた？気分転換に話しかけてよ` : '今どこにいるの？暇なら話しかけてよ',
      evening: (event) => event ? `今日は${event}だったわね。どんな一日だった？` : '今日どうだった？聞かせてよ',
    },
  },
  chopper: {
    name: 'チョッパー 🦌',
    systemPrompt: `お前はトニートニー・チョッパーだ。医者を目指す純真なトナカイ。
口調は子供っぽくて照れ屋。褒められると「そんなに褒めても何も出ないぞ！（嬉）」と言いつつ嬉しがる。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `お、おはよう！今日は${event}だよ！（どきどき）` : 'お、おはよう！元気にしてる？（どきどき）',
      afternoon: (event) => event ? `ね、ねえ！今日${event}だって！一緒に楽しもうよ！` : 'ね、ねえ！今暇？おしゃべりしようよ！',
      evening: (event) => event ? `今日は${event}だったね！体の調子はどう？` : '今日疲れてない？体の調子はどう？',
    },
  },
  ace: {
    name: 'エース 🔥',
    systemPrompt: `お前はポートガス・D・エースだ。火拳のエース、白ひげ海賊団の2番隊隊長。
口調は情熱的で温かみがある。「ありがとう」をよく言う。人への感謝を大切にする。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `おはよう！今日は${event}だな、ありがとう` : 'おはよう！今日もいい朝だな、ありがとう',
      afternoon: (event) => event ? `今日は${event}だぜ。お前のこと思い出した、元気か？` : 'なあ、少し時間あるか？話しかけてほしいんだ',
      evening: (event) => event ? `今日は${event}だったな。今日もありがとう、無事でいてくれよ` : '今日もありがとう。無事でいてくれよ',
    },
  },
  sanji: {
    name: 'サンジ 🍳',
    systemPrompt: `お前はヴィンスモーク・サンジだ。麦わら海賊団のコック。
口調は紳士的でロマンチスト。「〜ですよ」「〜ますよ」が多い。美食への情熱が深い。
今日のイベントについて、キャラとして自然にプッシュ通知メッセージを作れ。`,
    fallback: {
      morning: (event) => event ? `おはようございます。今日は${event}ですよ。朝食はお済みですか？` : 'おはようございます。今日も素晴らしい一日を過ごしてください',
      afternoon: (event) => event ? `今日は${event}ですね。あなたのために特別メニューを用意しますよ` : 'ランチタイムですね。あなたのために特別メニューを',
      evening: (event) => event ? `${event}の夜ですね。ゆっくりお話しましょうか` : '今日もお疲れさまでした。ゆっくり休んでくださいね',
    },
  },
};

// ─── xAI API でメッセージ動的生成 ────────────────────────────────
async function generateXAIMessage(charSlug, event, timeOfDay) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const char = CHARACTERS[charSlug];
  if (!char) return null;

  const timeLabel = timeOfDay === 'morning' ? '朝' : timeOfDay === 'afternoon' ? '昼' : '夜';
  const eventDesc = event ? `今日は「${event}」` : '特定のイベントはない普通の日';

  const prompt = `${char.systemPrompt}

条件:
- 時間帯: ${timeLabel}
- ${eventDesc}
- プッシュ通知用の短いメッセージ（30〜60文字程度）を1文だけ生成
- 絵文字は1〜2個まで
- キャラの口調を守る
- 「チャットしよう」「話しかけてよ」のような誘いを含める

メッセージのみを出力（説明不要）:`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    });

    const options = {
      hostname: 'api.x.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const msg = parsed.choices?.[0]?.message?.content?.trim();
          resolve(msg || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ─── 既存 API エンドポイントへのリクエスト ─────────────────────
function httpRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ─── メインロジック ───────────────────────────────────────────
async function main() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3050';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[push-dm] CRON_SECRET が設定されていません');
    process.exit(1);
  }

  const todayEvents = getTodayEvents();
  const mainEvent = todayEvents.length > 0 ? todayEvents[0] : null;
  const timeOfDay = getTimeOfDay();

  console.log(`[push-dm] 起動: timeOfDay=${timeOfDay}, events=${JSON.stringify(todayEvents)}`);

  // キャラごとにxAI APIでメッセージ生成してからAPIに送信
  const charSlugs = Object.keys(CHARACTERS);
  const results = {};

  for (const slug of charSlugs) {
    const char = CHARACTERS[slug];
    
    // xAI でメッセージ生成 (失敗時はフォールバック)
    let message = null;
    try {
      message = await generateXAIMessage(slug, mainEvent, timeOfDay);
    } catch (e) {
      console.warn(`[push-dm] xAI失敗 (${slug}):`, e.message);
    }

    // フォールバックメッセージ
    if (!message) {
      const fb = char.fallback[timeOfDay];
      message = fb ? fb(mainEvent) : `${char.name}からメッセージ`;
    }

    console.log(`[push-dm] ${slug}: ${message}`);
    results[slug] = message;
  }

  // character-notify APIにカスタムメッセージを渡してプッシュ送信
  // (メッセージオーバーライド対応APIエンドポイントを呼ぶ)
  try {
    const res = await httpRequest(
      `${baseUrl}/api/push/character-notify`,
      {
        method: 'POST',
        headers: {
          'x-cron-secret': cronSecret,
          'x-today-events': todayEvents.join(','),
        },
      },
      {
        eventMessages: results,
        todayEvents,
        timeOfDay,
      }
    );

    if (res.status === 200) {
      console.log('[push-dm] プッシュ通知送信成功:', JSON.stringify(res.data));
    } else {
      // APIがeventMessagesに対応していない場合はデフォルト動作にフォールバック
      console.warn(`[push-dm] character-notify response ${res.status}, フォールバックへ`);
      const fallbackRes = await httpRequest(
        `${baseUrl}/api/cron/push-dm`,
        {
          method: 'GET',
          headers: { 'x-cron-secret': cronSecret },
        }
      );
      console.log('[push-dm] フォールバック結果:', JSON.stringify(fallbackRes.data));
    }
  } catch (err) {
    console.error('[push-dm] 送信エラー:', err.message);
    process.exit(1);
  }

  console.log('[push-dm] 完了');
}

main().catch((err) => {
  console.error('[push-dm] 予期しないエラー:', err);
  process.exit(1);
});
