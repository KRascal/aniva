'use client';

import { useEffect } from 'react';

/* ────────────────────────────────── Toast ── */

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div
        className={`px-5 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-sm ${
          type === 'success'
            ? 'bg-green-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}
      >
        {message}
      </div>
    </div>
  );
}

/* ────────────────────────────────── Skeleton ── */

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-gray-800 rounded" />
          <div className="h-10 bg-gray-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────── JSON Helpers ── */

export function jsonStringify(val: unknown): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return '{}';
  }
}

export function jsonParse(val: string): Record<string, unknown> {
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}
