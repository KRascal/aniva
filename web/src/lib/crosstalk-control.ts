// ============================================================
// CrosstalkControl — キャラ間掛け合い制御ライブラリ
//
// 制御ルール（優先度順）:
// 1. どちらかのキャラでも emergencyStop=true → 禁止
// 2. allowedCrosstalkCharacterIds が [] → そのキャラは全掛け合い禁止
// 3. allowedCrosstalkCharacterIds が ["id1","id2"] → 許可リストにない相手とは禁止
// 4. bannedCrosstalkFranchises に相手のfranchiseが含まれる → 禁止
// 5. 上記に該当しない → 許可
//
// 疎結合: validateCrosstalk() → 結果を返すだけ（DB読み取りのみ）
// ============================================================

import { prisma } from './prisma';

export interface CrosstalkValidationResult {
  allowed: boolean;
  reason?: string; // 禁止の場合の理由
  blockedPair?: [string, string]; // 禁止になったキャラIDペア
}

interface CharacterCrosstalkConfig {
  id: string;
  name: string;
  franchise: string;
  emergencyStop: boolean;
  allowedCrosstalkCharacterIds: unknown; // null | string[]
  bannedCrosstalkFranchises: string[];
}

/**
 * キャラIDリストの組み合わせが全て掛け合い可能かチェック
 *
 * @param characterIds - グループチャットに参加するキャラのIDリスト（2件以上）
 * @returns CrosstalkValidationResult
 */
export async function validateCrosstalk(
  characterIds: string[],
): Promise<CrosstalkValidationResult> {
  if (characterIds.length < 2) {
    return { allowed: true };
  }

  // キャラ情報を一括取得
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: {
      id: true,
      name: true,
      franchise: true,
      emergencyStop: true,
      allowedCrosstalkCharacterIds: true,
      bannedCrosstalkFranchises: true,
    },
  }) as CharacterCrosstalkConfig[];

  if (characters.length !== characterIds.length) {
    return { allowed: false, reason: '一部のキャラクターが見つかりません' };
  }

  const charMap = new Map(characters.map(c => [c.id, c]));

  // 全ペアを検証
  for (let i = 0; i < characterIds.length; i++) {
    for (let j = i + 1; j < characterIds.length; j++) {
      const charA = charMap.get(characterIds[i])!;
      const charB = charMap.get(characterIds[j])!;

      const result = checkPair(charA, charB);
      if (!result.allowed) {
        return result;
      }
    }
  }

  return { allowed: true };
}

function checkPair(
  charA: CharacterCrosstalkConfig,
  charB: CharacterCrosstalkConfig,
): CrosstalkValidationResult {
  // Rule 1: 緊急停止
  if (charA.emergencyStop) {
    return {
      allowed: false,
      reason: `${charA.name} は現在掛け合いが停止されています`,
      blockedPair: [charA.id, charB.id],
    };
  }
  if (charB.emergencyStop) {
    return {
      allowed: false,
      reason: `${charB.name} は現在掛け合いが停止されています`,
      blockedPair: [charA.id, charB.id],
    };
  }

  // Rule 2 & 3: allowedCrosstalkCharacterIds チェック (charA → charBを許可するか)
  const checkAllowed = (from: CharacterCrosstalkConfig, to: CharacterCrosstalkConfig) => {
    const allowed = from.allowedCrosstalkCharacterIds;
    if (allowed === null || allowed === undefined) return true; // 制限なし
    if (!Array.isArray(allowed)) return true; // 不正値は無視
    if (allowed.length === 0) return false; // 全禁止
    return (allowed as string[]).includes(to.id); // 許可リスト
  };

  if (!checkAllowed(charA, charB)) {
    return {
      allowed: false,
      reason: `${charA.name} と ${charB.name} の掛け合いは許可されていません`,
      blockedPair: [charA.id, charB.id],
    };
  }
  if (!checkAllowed(charB, charA)) {
    return {
      allowed: false,
      reason: `${charB.name} と ${charA.name} の掛け合いは許可されていません`,
      blockedPair: [charA.id, charB.id],
    };
  }

  // Rule 4: bannedCrosstalkFranchises チェック
  if (charA.bannedCrosstalkFranchises.includes(charB.franchise)) {
    return {
      allowed: false,
      reason: `${charA.name} は「${charB.franchise}」のキャラとの掛け合いが禁止されています`,
      blockedPair: [charA.id, charB.id],
    };
  }
  if (charB.bannedCrosstalkFranchises.includes(charA.franchise)) {
    return {
      allowed: false,
      reason: `${charB.name} は「${charA.franchise}」のキャラとの掛け合いが禁止されています`,
      blockedPair: [charA.id, charB.id],
    };
  }

  return { allowed: true };
}

/**
 * キャラクターの掛け合い設定を更新（管理API用）
 *
 * @param characterId - 設定対象キャラID
 * @param config - 掛け合い制御設定
 */
export async function updateCrosstalkConfig(
  characterId: string,
  config: {
    allowedCrosstalkCharacterIds?: string[] | null; // null=制限なし, []=全禁止, ["id..."]=許可リスト
    bannedCrosstalkFranchises?: string[];
  },
): Promise<void> {
  await prisma.character.update({
    where: { id: characterId },
    data: {
      ...(config.allowedCrosstalkCharacterIds !== undefined && {
        allowedCrosstalkCharacterIds: config.allowedCrosstalkCharacterIds,
      }),
      ...(config.bannedCrosstalkFranchises !== undefined && {
        bannedCrosstalkFranchises: config.bannedCrosstalkFranchises,
      }),
    },
  });
}

/**
 * キャラクターの掛け合い設定を取得
 */
export async function getCrosstalkConfig(characterId: string) {
  const char = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      franchise: true,
      allowedCrosstalkCharacterIds: true,
      bannedCrosstalkFranchises: true,
    },
  });
  if (!char) return null;

  const allowed = char.allowedCrosstalkCharacterIds;
  const mode: 'all' | 'allowlist' | 'blocked' =
    allowed === null || allowed === undefined ? 'all' :
    Array.isArray(allowed) && (allowed as string[]).length === 0 ? 'blocked' :
    'allowlist';

  return {
    id: char.id,
    name: char.name,
    franchise: char.franchise,
    mode,
    allowedCharacterIds: Array.isArray(allowed) ? (allowed as string[]) : [],
    bannedFranchises: char.bannedCrosstalkFranchises,
  };
}
