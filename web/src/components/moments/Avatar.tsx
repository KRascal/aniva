import Image from 'next/image';
import type { MomentCharacter } from './types';

export function Avatar({
  character,
  size = 'md',
  ring = false,
  online = false,
}: {
  character: MomentCharacter;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  online?: boolean;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm';
  const ringClass = ring ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : '';

  return (
    <div className={`relative flex-shrink-0 ${sizeClass}`}>
      <div className={`${sizeClass} rounded-full overflow-hidden ${ringClass} relative`}>
        {character.avatarUrl ? (
          <Image src={character.avatarUrl} alt={character.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-gray-900" />
      )}
    </div>
  );
}
