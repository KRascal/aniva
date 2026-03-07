'use client';

import { useEffect } from 'react';

/**
 * スクロールで要素をフェードイン表示する汎用フック
 * 使い方: コンポーネントに `data-reveal` 属性を付けて useScrollReveal() を呼ぶ
 *
 * アニメーション種別 (data-reveal="fade" | "slide-up" | "slide-left" | "zoom"):
 *   fade      — フェードイン
 *   slide-up  — 下から上にスライドイン（デフォルト）
 *   slide-left — 右から左にスライドイン
 *   zoom      — スケールアップ
 */
export function useScrollReveal() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      [data-reveal] {
        opacity: 0;
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      [data-reveal="slide-up"], [data-reveal=""] {
        transform: translateY(20px);
      }
      [data-reveal="slide-left"] {
        transform: translateX(20px);
      }
      [data-reveal="zoom"] {
        transform: scale(0.95);
      }
      [data-reveal].revealed {
        opacity: 1;
        transform: none;
      }
    `;
    document.head.appendChild(style);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.revealDelay ? parseInt(el.dataset.revealDelay) : 0;
            setTimeout(() => el.classList.add('revealed'), delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      document.head.removeChild(style);
    };
  }, []);
}
