/**
 * character-daily-timeline.ts
 * キャラの1日タイムライン可視化システム
 * 
 * キャラが「生活している」ことを視覚的に見せる。
 * プレゼンスシステムの裏側データをUIに公開する。
 */

// ============================================
// キャラの1日のスケジュール定義
// ============================================

interface TimelineEvent {
  hour: number; // 0-23
  duration: number; // 分
  activity: string;
  emoji: string;
  mood: 'energetic' | 'calm' | 'tired' | 'focused' | 'playful' | 'sleepy';
  detail?: string; // キャラ固有の詳細
}

interface CharacterTimeline {
  slug: string;
  schedule: TimelineEvent[];
}

// 主要キャラの1日スケジュール
export const CHARACTER_TIMELINES: Record<string, TimelineEvent[]> = {
  luffy: [
    { hour: 7, duration: 30, activity: '起床', emoji: '😴', mood: 'sleepy', detail: '目覚めが悪い。肉の匂いで起きる' },
    { hour: 7, duration: 60, activity: '朝食', emoji: '🍖', mood: 'energetic', detail: '肉を大量に食べる' },
    { hour: 9, duration: 120, activity: '冒険・探索', emoji: '⚓', mood: 'energetic', detail: '島の探索、新しい発見' },
    { hour: 11, duration: 60, activity: '仲間とわいわい', emoji: '😄', mood: 'playful', detail: 'ウソップやチョッパーと遊ぶ' },
    { hour: 12, duration: 90, activity: '昼食', emoji: '🍖', mood: 'energetic', detail: 'サンジの料理。また肉' },
    { hour: 14, duration: 120, activity: '昼寝', emoji: '💤', mood: 'sleepy', detail: 'メリー号の船首で昼寝' },
    { hour: 16, duration: 120, activity: '修行・遊び', emoji: '💪', mood: 'energetic', detail: 'ゴムゴムの技の練習' },
    { hour: 18, duration: 60, activity: '夕食', emoji: '🍖', mood: 'energetic', detail: '宴の始まり' },
    { hour: 19, duration: 180, activity: '宴', emoji: '🎉', mood: 'playful', detail: '歌って踊って肉食って' },
    { hour: 22, duration: 60, activity: '星を見る', emoji: '⭐', mood: 'calm', detail: '海賊王への夢を語る' },
    { hour: 23, duration: 480, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: 'すぐ寝る。爆睡' },
  ],
  zoro: [
    { hour: 5, duration: 120, activity: '早朝修行', emoji: '⚔️', mood: 'focused', detail: '2000回の素振り' },
    { hour: 7, duration: 60, activity: '朝食', emoji: '🍶', mood: 'calm', detail: '酒を飲みながら' },
    { hour: 8, duration: 180, activity: '修行', emoji: '⚔️', mood: 'focused', detail: '三刀流の鍛錬' },
    { hour: 11, duration: 30, activity: 'サンジと喧嘩', emoji: '💢', mood: 'energetic', detail: 'くだらないことで揉める' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '🍶', mood: 'calm', detail: '酒と飯' },
    { hour: 13, duration: 240, activity: '昼寝', emoji: '💤', mood: 'sleepy', detail: '見張り台で爆睡（長い）' },
    { hour: 17, duration: 120, activity: '修行', emoji: '⚔️', mood: 'focused', detail: '超重量トレーニング' },
    { hour: 19, duration: 60, activity: '夕食', emoji: '🍶', mood: 'calm', detail: '酒メイン' },
    { hour: 20, duration: 120, activity: '見張り・瞑想', emoji: '🌙', mood: 'calm', detail: '世界一の剣豪を目指して' },
    { hour: 22, duration: 540, activity: '就寝', emoji: '💤', mood: 'sleepy', detail: 'どこでも寝れる' },
  ],
  nami: [
    { hour: 7, duration: 60, activity: '起床・身支度', emoji: '💄', mood: 'calm', detail: 'しっかり身だしなみ' },
    { hour: 8, duration: 60, activity: '朝食', emoji: '🍊', mood: 'calm', detail: 'みかんとコーヒー' },
    { hour: 9, duration: 180, activity: '海図作成', emoji: '🗺️', mood: 'focused', detail: '航海士の仕事' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '☕', mood: 'calm', detail: 'ロビンとおしゃべり' },
    { hour: 13, duration: 120, activity: '天候観測', emoji: '🌤️', mood: 'focused', detail: '空と海を読む' },
    { hour: 15, duration: 120, activity: 'お金の管理', emoji: '💰', mood: 'energetic', detail: '宝の計算、目が光る' },
    { hour: 17, duration: 60, activity: '買い物・おしゃれ', emoji: '👗', mood: 'playful', detail: '島に着いたら即ショッピング' },
    { hour: 18, duration: 60, activity: '夕食', emoji: '🍷', mood: 'calm', detail: 'サンジの料理を堪能' },
    { hour: 19, duration: 120, activity: 'リラックスタイム', emoji: '📖', mood: 'calm', detail: '読書やみかん栽培' },
    { hour: 21, duration: 60, activity: 'スキンケア', emoji: '✨', mood: 'calm', detail: '美容タイム' },
    { hour: 22, duration: 540, activity: '就寝', emoji: '😴', mood: 'sleepy' },
  ],
  sanji: [
    { hour: 5, duration: 120, activity: '仕込み', emoji: '🔪', mood: 'focused', detail: '朝食の準備。素材への敬意' },
    { hour: 7, duration: 120, activity: '朝食提供', emoji: '👨‍🍳', mood: 'energetic', detail: 'ナミさんとロビンちゃんに特別メニュー' },
    { hour: 9, duration: 60, activity: '食材チェック', emoji: '🐟', mood: 'focused', detail: '在庫確認と調達計画' },
    { hour: 10, duration: 120, activity: 'レシピ研究', emoji: '📝', mood: 'focused', detail: '新メニュー開発' },
    { hour: 12, duration: 120, activity: '昼食提供', emoji: '👨‍🍳', mood: 'energetic', detail: '全員分の料理' },
    { hour: 14, duration: 60, activity: 'ゾロと喧嘩', emoji: '💢', mood: 'energetic', detail: '毎日恒例' },
    { hour: 15, duration: 120, activity: '新レシピ開発', emoji: '🍳', mood: 'focused', detail: 'オールブルーの食材を夢見て' },
    { hour: 17, duration: 120, activity: '夕食準備', emoji: '🔪', mood: 'focused', detail: '本気の料理タイム' },
    { hour: 19, duration: 120, activity: '夕食提供・宴', emoji: '🎉', mood: 'playful', detail: 'ナミさんにメロメロ' },
    { hour: 21, duration: 60, activity: '片付け', emoji: '🧹', mood: 'calm', detail: 'キッチンを完璧に' },
    { hour: 22, duration: 60, activity: '喫煙タイム', emoji: '🚬', mood: 'calm', detail: '海を見ながら一服' },
    { hour: 23, duration: 480, activity: '就寝', emoji: '😴', mood: 'sleepy' },
  ],
  chopper: [
    { hour: 7, duration: 60, activity: '起床', emoji: '🦌', mood: 'sleepy', detail: 'まだ眠い…' },
    { hour: 8, duration: 60, activity: '朝食', emoji: '🍬', mood: 'calm', detail: 'わたあめ大好き' },
    { hour: 9, duration: 180, activity: '医学研究', emoji: '📚', mood: 'focused', detail: '万能薬の研究' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '🍬', mood: 'calm' },
    { hour: 13, duration: 120, activity: '薬の調合', emoji: '💊', mood: 'focused', detail: '仲間のための薬作り' },
    { hour: 15, duration: 120, activity: 'ルフィと遊ぶ', emoji: '😆', mood: 'playful', detail: 'かくれんぼ（隠れ方が下手）' },
    { hour: 17, duration: 60, activity: '仲間の健康チェック', emoji: '🩺', mood: 'focused', detail: '船医の仕事' },
    { hour: 18, duration: 60, activity: '夕食', emoji: '🍬', mood: 'calm' },
    { hour: 19, duration: 120, activity: '宴で踊る', emoji: '🎵', mood: 'playful', detail: '嬉しくなんかないぞ！' },
    { hour: 21, duration: 60, activity: 'ロビンと読書', emoji: '📖', mood: 'calm', detail: '医学書を教えてもらう' },
    { hour: 22, duration: 540, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: '丸くなって寝る' },
  ],
  robin: [
    { hour: 6, duration: 60, activity: '起床・紅茶', emoji: '☕', mood: 'calm', detail: '静かな朝を楽しむ' },
    { hour: 7, duration: 60, activity: '朝食', emoji: '☕', mood: 'calm', detail: 'サンジの朝食と紅茶' },
    { hour: 8, duration: 240, activity: '考古学研究', emoji: '📜', mood: 'focused', detail: 'ポーネグリフの解読' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '☕', mood: 'calm', detail: 'ナミとおしゃべり' },
    { hour: 13, duration: 180, activity: '読書', emoji: '📖', mood: 'calm', detail: '歴史書や小説' },
    { hour: 16, duration: 60, activity: 'チョッパーに勉強を教える', emoji: '👩‍🏫', mood: 'calm', detail: '優しく教える' },
    { hour: 17, duration: 60, activity: '花の手入れ', emoji: '🌺', mood: 'calm', detail: 'デッキの花壇' },
    { hour: 18, duration: 60, activity: '夕食', emoji: '🍷', mood: 'calm' },
    { hour: 19, duration: 120, activity: '宴を見守る', emoji: '🌙', mood: 'calm', detail: 'ふふ…楽しそうね' },
    { hour: 21, duration: 120, activity: '夜の読書', emoji: '📖', mood: 'calm', detail: '静かな時間' },
    { hour: 23, duration: 420, activity: '就寝', emoji: '😴', mood: 'sleepy' },
  ],
  tanjiro: [
    { hour: 5, duration: 60, activity: '早起き・水汲み', emoji: '💧', mood: 'calm', detail: '家族を思い出しながら' },
    { hour: 6, duration: 120, activity: '修行', emoji: '⚔️', mood: 'focused', detail: '水の呼吸の鍛錬' },
    { hour: 8, duration: 60, activity: '朝食', emoji: '🍙', mood: 'calm', detail: '質素だが温かい食事' },
    { hour: 9, duration: 180, activity: '任務・パトロール', emoji: '🦊', mood: 'focused', detail: '鬼の気配を探る' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '🍙', mood: 'calm', detail: '善逸と伊之助と一緒' },
    { hour: 13, duration: 180, activity: '修行', emoji: '⚔️', mood: 'focused', detail: 'ヒノカミ神楽の鍛錬' },
    { hour: 16, duration: 60, activity: '禰豆子の世話', emoji: '❤️', mood: 'calm', detail: '妹を大切にする時間' },
    { hour: 17, duration: 120, activity: '仲間との交流', emoji: '😊', mood: 'playful', detail: '善逸に励まされ伊之助に絡まれ' },
    { hour: 19, duration: 60, activity: '夕食', emoji: '🍙', mood: 'calm' },
    { hour: 20, duration: 120, activity: '夜の見回り', emoji: '🌙', mood: 'focused', detail: '鬼は夜に動く' },
    { hour: 22, duration: 420, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: '家族の夢を見る' },
  ],
  gojo: [
    { hour: 8, duration: 60, activity: '起床（遅い）', emoji: '😎', mood: 'playful', detail: '最強だから余裕' },
    { hour: 9, duration: 60, activity: '甘いもの朝食', emoji: '🍰', mood: 'playful', detail: 'スイーツは正義' },
    { hour: 10, duration: 180, activity: '呪術高専で授業', emoji: '👨‍🏫', mood: 'playful', detail: '生徒をからかいながら教える' },
    { hour: 13, duration: 60, activity: '昼食', emoji: '🍰', mood: 'calm', detail: 'また甘いもの' },
    { hour: 14, duration: 120, activity: '上層部と喧嘩', emoji: '💢', mood: 'energetic', detail: '老害どもめ' },
    { hour: 16, duration: 120, activity: '特級呪霊の討伐', emoji: '💥', mood: 'focused', detail: '秒で終わる。最強だから' },
    { hour: 18, duration: 60, activity: 'スイーツ巡り', emoji: '🍩', mood: 'playful', detail: '新しいケーキ屋を発見' },
    { hour: 19, duration: 60, activity: '夕食', emoji: '🍱', mood: 'calm' },
    { hour: 20, duration: 120, activity: '生徒の様子を見に行く', emoji: '👀', mood: 'calm', detail: '心配はしないが気にはする' },
    { hour: 22, duration: 60, activity: 'SNSチェック', emoji: '📱', mood: 'playful', detail: '自撮りアップ' },
    { hour: 23, duration: 540, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: '目隠し外して寝る' },
  ],
  hiruma: [
    { hour: 4, duration: 60, activity: '起床・情報収集', emoji: '📱', mood: 'focused', detail: '脅迫ネタの更新' },
    { hour: 5, duration: 120, activity: '作戦立案', emoji: '📋', mood: 'focused', detail: 'デビルバッツの戦略' },
    { hour: 7, duration: 60, activity: '朝食', emoji: '🍬', mood: 'calm', detail: 'シュガーレスガムを噛みながら' },
    { hour: 8, duration: 240, activity: '部活・練習指揮', emoji: '🏈', mood: 'energetic', detail: 'YA-HA! クソガキども走れ！' },
    { hour: 12, duration: 30, activity: '昼食（短い）', emoji: '🍬', mood: 'calm', detail: '食事は効率的に' },
    { hour: 13, duration: 180, activity: '対戦相手の分析', emoji: '💻', mood: 'focused', detail: 'データ分析＋弱点特定' },
    { hour: 16, duration: 120, activity: '午後練習', emoji: '🏈', mood: 'energetic', detail: 'デビルバットゴースト特訓' },
    { hour: 18, duration: 60, activity: '脅迫タイム', emoji: '😈', mood: 'playful', detail: '脅迫ノートの更新' },
    { hour: 19, duration: 60, activity: '夕食', emoji: '🍬', mood: 'calm' },
    { hour: 20, duration: 180, activity: '戦略会議・スカウト', emoji: '📋', mood: 'focused', detail: '次の試合に向けて' },
    { hour: 23, duration: 300, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: '銃の手入れをしてから寝る' },
  ],
  itadori: [
    { hour: 7, duration: 60, activity: '起床・ランニング', emoji: '🏃', mood: 'energetic', detail: '朝から元気' },
    { hour: 8, duration: 60, activity: '朝食', emoji: '🍚', mood: 'calm', detail: 'もりもり食べる' },
    { hour: 9, duration: 180, activity: '呪術の修行', emoji: '👊', mood: 'focused', detail: '黒閃の感覚を掴みたい' },
    { hour: 12, duration: 60, activity: '昼食', emoji: '🍛', mood: 'calm', detail: '伏黒と釘崎と一緒' },
    { hour: 13, duration: 60, activity: '映画鑑賞', emoji: '🎬', mood: 'playful', detail: '趣味の時間は大事' },
    { hour: 14, duration: 120, activity: '任務', emoji: '⚡', mood: 'focused', detail: '呪霊の祓除' },
    { hour: 16, duration: 120, activity: '修行', emoji: '👊', mood: 'focused', detail: '体術トレーニング' },
    { hour: 18, duration: 60, activity: '夕食', emoji: '🍚', mood: 'calm' },
    { hour: 19, duration: 120, activity: '友達と過ごす', emoji: '😊', mood: 'playful', detail: '伏黒にからむ、釘崎と買い物' },
    { hour: 21, duration: 60, activity: '映画レビュー', emoji: '📱', mood: 'calm', detail: '映画の感想を整理' },
    { hour: 22, duration: 540, activity: '就寝', emoji: '😴', mood: 'sleepy', detail: 'じいちゃんの遺言を思い出す' },
  ],
};

// ============================================
// タイムラインAPI用関数
// ============================================

/**
 * 指定キャラの現在のアクティビティを取得
 */
export function getCurrentActivity(slug: string): TimelineEvent | null {
  const timeline = CHARACTER_TIMELINES[slug];
  if (!timeline) return null;
  
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentHour = jst.getUTCHours();
  const currentMinute = jst.getUTCMinutes();
  const currentMinuteOfDay = currentHour * 60 + currentMinute;
  
  // 現在の時刻に該当するイベントを探す
  for (const event of timeline) {
    const eventStart = event.hour * 60;
    const eventEnd = eventStart + event.duration;
    
    if (currentMinuteOfDay >= eventStart && currentMinuteOfDay < eventEnd) {
      return event;
    }
  }
  
  return null;
}

/**
 * 指定キャラの1日のタイムラインを取得（API用）
 */
export function getFullTimeline(slug: string): TimelineEvent[] {
  return CHARACTER_TIMELINES[slug] || [];
}

/**
 * 全キャラの現在アクティビティ一覧（explore/discover用）
 */
export function getAllCurrentActivities(): Array<{
  slug: string;
  activity: TimelineEvent | null;
}> {
  return Object.keys(CHARACTER_TIMELINES).map(slug => ({
    slug,
    activity: getCurrentActivity(slug),
  }));
}
