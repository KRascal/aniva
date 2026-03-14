'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RelationshipData {
  id: string;
  relatedName: string;
  relationshipType: string;
  description: string;
  emotionalBond: number;
  relatedCharacter: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  } | null;
}

interface RelationshipMapProps {
  characterId: string;
  characterName: string;
}

export function RelationshipMap({ characterId, characterName }: RelationshipMapProps) {
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/characters/${characterId}/relationships`)
      .then((r) => r.json())
      .then((data) => setRelationships(data.relationships || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  if (loading)
    return (
      <div className="py-4 text-center text-gray-500 text-sm">読み込み中...</div>
    );

  // 関係性がゼロなら何も表示しない
  if (relationships.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        つながり
      </h3>
      <div className="space-y-2">
        {relationships.map((rel) => (
          <div
            key={rel.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {/* アバター */}
            <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden">
              {rel.relatedCharacter?.avatarUrl ? (
                <img
                  src={rel.relatedCharacter.avatarUrl}
                  alt={rel.relatedName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                  {rel.relatedName[0]}
                </div>
              )}
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
              {rel.relatedCharacter ? (
                <Link
                  href={`/profile/${rel.relatedCharacter.slug}`}
                  className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {rel.relatedName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-white">
                  {rel.relatedName}
                </span>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                <span className="text-blue-400/80">{rel.relationshipType}</span>
                {rel.description && (
                  <span className="ml-1">— {rel.description.slice(0, 50)}</span>
                )}
              </div>
            </div>

            {/* 絆レベル */}
            <div className="flex-shrink-0">
              <div className="text-xs text-gray-500">
                {getEmotionalBondLabel(rel.emotionalBond)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEmotionalBondLabel(bond: number): string {
  if (bond >= 90) return '💛 深い絆';
  if (bond >= 70) return '🤝 強い絆';
  if (bond >= 50) return '😊 友好';
  if (bond >= 30) return '🔥 ライバル';
  return '💫 知り合い';
}
