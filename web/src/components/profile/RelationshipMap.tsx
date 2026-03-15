'use client';
import { useEffect, useState } from 'react';

interface CharacterRelation {
  targetCharacterId: string;
  targetName: string;
  targetAvatarUrl: string | null;
  relationLabel: string; // 「仲間」「ライバル」「兄弟」等
}

interface RelationshipMapProps {
  characterId: string;
  characterName: string;
}

export default function RelationshipMap({ characterId, characterName: _characterName }: RelationshipMapProps) {
  const [relations, setRelations] = useState<CharacterRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/characters/${characterId}/relationships`)
      .then(r => r.ok ? r.json() : { relations: [] })
      .then(data => setRelations(data.relations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  if (loading) {
    return (
      <div className="py-4">
        <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (relations.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-white/70 text-xs font-bold tracking-wider uppercase mb-3">関係性</h3>
      <div className="flex flex-wrap gap-3">
        {relations.map((rel) => (
          <div
            key={rel.targetCharacterId}
            className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {rel.targetAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rel.targetAvatarUrl} alt={rel.targetName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-300 font-bold">
                {rel.targetName[0]}
              </div>
            )}
            <div>
              <p className="text-white text-xs font-semibold">{rel.targetName}</p>
              <p className="text-white/40 text-[10px]">{rel.relationLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
