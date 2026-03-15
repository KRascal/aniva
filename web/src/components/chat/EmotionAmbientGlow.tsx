'use client';

interface Props {
  emotion: string;
}

const EMOTION_GRADIENTS: Record<string, string> = {
  excited: 'radial-gradient(ellipse at bottom, rgba(251,146,60,0.4) 0%, transparent 70%)',
  happy: 'radial-gradient(ellipse at bottom, rgba(250,204,21,0.3) 0%, transparent 70%)',
  angry: 'radial-gradient(ellipse at bottom, rgba(239,68,68,0.4) 0%, transparent 60%)',
  sad: 'radial-gradient(ellipse at bottom, rgba(59,130,246,0.3) 0%, transparent 70%)',
  love: 'radial-gradient(ellipse at bottom, rgba(236,72,153,0.4) 0%, transparent 70%)',
  shy: 'radial-gradient(ellipse at bottom, rgba(244,114,182,0.3) 0%, transparent 70%)',
  surprised: 'radial-gradient(ellipse at bottom, rgba(34,211,238,0.3) 0%, transparent 70%)',
  jealous: 'radial-gradient(ellipse at bottom, rgba(168,85,247,0.3) 0%, transparent 70%)',
  lonely: 'radial-gradient(ellipse at bottom, rgba(139,92,246,0.3) 0%, transparent 70%)',
  teasing: 'radial-gradient(ellipse at bottom, rgba(167,139,250,0.3) 0%, transparent 70%)',
  proud: 'radial-gradient(ellipse at bottom, rgba(245,158,11,0.3) 0%, transparent 70%)',
  motivated: 'radial-gradient(ellipse at bottom, rgba(249,115,22,0.3) 0%, transparent 70%)',
};

export function EmotionAmbientGlow({ emotion }: Props) {
  if (!emotion || emotion === 'neutral') return null;
  const gradient = EMOTION_GRADIENTS[emotion];
  if (!gradient) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{
        opacity: 0.15,
        background: gradient,
      }}
    />
  );
}
