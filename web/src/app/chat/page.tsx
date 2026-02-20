'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/characters')
        .then((res) => res.json())
        .then((data) => {
          setCharacters(data.characters || []);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">ANIVA</h1>
          <div className="text-sm text-gray-400">
            {session?.user?.email}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">キャラクターを選ぼう</h2>
          <p className="text-gray-400 text-sm">推しと話してみよう 🌟</p>
        </div>

        {characters.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">🏴‍☠️</div>
            <p>キャラクターが見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.map((character) => (
              <button
                key={character.id}
                onClick={() => router.push(`/chat/${character.id}`)}
                className="w-full text-left bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700 hover:border-purple-500 rounded-2xl overflow-hidden transition-all duration-200 group"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    {character.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={character.avatarUrl}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🏴‍☠️</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white text-lg leading-tight">{character.name}</h3>
                    </div>
                    <p className="text-purple-400 text-sm mb-1">{character.franchise}</p>
                    {character.catchphrases && character.catchphrases.length > 0 && (
                      <p className="text-gray-400 text-sm truncate">
                        &ldquo;{character.catchphrases[0]}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 text-gray-500 group-hover:text-purple-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
