'use client';

import { useEffect } from 'react';

export function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.register('/push-sw.js').catch((err) => {
      console.warn('push-sw.js registration failed:', err);
    });
  }, []);

  return null;
}
