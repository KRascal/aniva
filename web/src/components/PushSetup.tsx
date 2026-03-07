'use client';

import { useEffect } from 'react';

export function PushSetup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register push service worker
    navigator.serviceWorker.register('/push-sw.js', { scope: '/' }).catch(() => {
      // Silent fail — push is optional
    });
  }, []);

  return null;
}
