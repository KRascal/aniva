'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface CharacterSuggestion {
  slug: string;
  name: string;
  franchise: string;
  avatarUrl: string | null;
}

interface ApiCharacter {
  id: string;
  name: string;
  slug: string | null;
  franchise: string | null;
  avatarUrl: string | null;
}

interface CharacterSearchInputProps {
  onSelect?: (slug: string) => void;
  placeholder?: string;
}

export default function CharacterSearchInput({
  onSelect,
  placeholder = '名前を呼んでみて…',
}: CharacterSearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CharacterSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/characters?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as { characters: ApiCharacter[] };
      const mapped: CharacterSuggestion[] = data.characters.slice(0, 6).map((c) => ({
        slug: c.slug ?? c.id,
        name: c.name,
        franchise: c.franchise ?? '',
        avatarUrl: c.avatarUrl,
      }));
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery('');
      if (onSelect) {
        onSelect(slug);
      } else {
        router.push(`/c/${slug}`);
      }
    },
    [onSelect, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex].slug);
      } else if (suggestions.length === 1 && suggestions[0]) {
        handleSelect(suggestions[0].slug);
      } else if (query.trim()) {
        router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      {/* Input */}
      <div
        className="relative flex items-center"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: '9999px',
          boxShadow: '0 0 20px rgba(168,85,247,0.2)',
        }}
      >
        {/* Search icon */}
        <span className="absolute left-4 text-purple-400/60 select-none pointer-events-none text-sm">
          ✦
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-white placeholder-white/30 text-sm py-3 pl-10 pr-10 outline-none tracking-wide"
          style={{ letterSpacing: '0.08em' }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="キャラクター検索"
          aria-autocomplete="list"
          aria-controls="character-suggestions"
          aria-expanded={open}
        />
        {/* Loading spinner */}
        {loading && (
          <span className="absolute right-4 text-purple-400/60 text-xs animate-spin">
            ◌
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          id="character-suggestions"
          ref={listRef}
          role="listbox"
          className="absolute top-full mt-2 w-full rounded-2xl overflow-hidden z-50"
          style={{
            background: 'rgba(10,0,20,0.92)',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 8px 32px rgba(168,85,247,0.15), 0 2px 8px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              role="option"
              aria-selected={i === activeIndex}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: i === activeIndex ? 'rgba(168,85,247,0.15)' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={() => handleSelect(s.slug)}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-purple-500/30">
                {s.avatarUrl ? (
                  <Image
                    src={s.avatarUrl}
                    alt={s.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-purple-900/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                    {s.name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">{s.name}</span>
                {s.franchise && (
                  <span className="text-white/40 text-xs truncate">{s.franchise}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
