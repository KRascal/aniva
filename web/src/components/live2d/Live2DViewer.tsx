'use client';

import { useEffect, useRef, useState } from 'react';

interface Live2DViewerProps {
  modelPath?: string;
  emotion?: string;
  isSpeaking?: boolean;
  width?: number;
  height?: number;
}

/**
 * Live2Dキャラクター表示コンポーネント
 * Phase 1: アニメーションする立ち絵として実装
 * Phase 2: 実際のLive2Dモデルに置き換え
 */
export default function Live2DViewer({
  modelPath,
  emotion = 'neutral',
  isSpeaking = false,
  width = 300,
  height = 400,
}: Live2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const animFrameRef = useRef<number>(0);

  // キャラクターの表情マッピング
  const emotionConfig: Record<string, { eyeScale: number; mouthOpen: number; bodyBounce: number; color: string }> = {
    neutral: { eyeScale: 1, mouthOpen: 0, bodyBounce: 0.5, color: '#FF6B6B' },
    happy: { eyeScale: 1.1, mouthOpen: 0.3, bodyBounce: 1, color: '#FFD93D' },
    excited: { eyeScale: 1.3, mouthOpen: 0.6, bodyBounce: 2, color: '#FF6B6B' },
    angry: { eyeScale: 0.8, mouthOpen: 0.4, bodyBounce: 0.3, color: '#FF4444' },
    sad: { eyeScale: 0.9, mouthOpen: 0.1, bodyBounce: 0.2, color: '#6B9FFF' },
    hungry: { eyeScale: 1.2, mouthOpen: 0.5, bodyBounce: 1.5, color: '#FF9F43' },
    surprised: { eyeScale: 1.4, mouthOpen: 0.7, bodyBounce: 1.8, color: '#A29BFE' },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * 2; // Retina対応
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    let time = 0;
    const config = emotionConfig[emotion] || emotionConfig.neutral;

    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const bounceY = Math.sin(time * config.bodyBounce) * 3;

      // 体（シルエット）
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 60 + bounceY, 50, 70, 0, 0, Math.PI * 2);
      ctx.fill();

      // 頭
      ctx.fillStyle = '#FFE0BD';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 30 + bounceY, 45, 0, Math.PI * 2);
      ctx.fill();

      // 麦わら帽子（ルフィ用）
      ctx.fillStyle = '#F4D03F';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 65 + bounceY, 55, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 75 + bounceY, 35, 25, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // 目
      const eyeScale = config.eyeScale;
      const blinkPhase = Math.sin(time * 3);
      const eyeHeight = blinkPhase > 0.95 ? 1 : 6 * eyeScale; // 瞬き

      // 左目
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(centerX - 15, centerY - 35 + bounceY, 5, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // 右目
      ctx.beginPath();
      ctx.ellipse(centerX + 15, centerY - 35 + bounceY, 5, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // 口
      const mouthOpen = isSpeaking
        ? Math.abs(Math.sin(time * 8)) * 8
        : config.mouthOpen * 5;

      ctx.fillStyle = '#333';
      ctx.beginPath();
      if (emotion === 'happy' || emotion === 'excited') {
        // 笑顔
        ctx.arc(centerX, centerY - 18 + bounceY, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      } else {
        ctx.ellipse(centerX, centerY - 15 + bounceY, 8, mouthOpen + 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 傷（ルフィの頬の傷）
      ctx.strokeStyle = '#CC0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 25, centerY - 25 + bounceY);
      ctx.lineTo(centerX - 18, centerY - 20 + bounceY);
      ctx.stroke();

      // 名前
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ルフィ', centerX, centerY + 150 + bounceY);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    setIsLoaded(true);
    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [emotion, isSpeaking, width, height]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-xl"
        style={{ width, height }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      )}
    </div>
  );
}
