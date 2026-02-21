'use client';

interface EmotionIndicatorProps {
  emotion: string;
  level: number;
}

const emotionEmojis: Record<string, string> = {
  neutral: '😊',
  happy: '😄',
  excited: '🤩',
  angry: '😠',
  sad: '😢',
  hungry: '🤤',
  surprised: '😲',
};

const levelNames = ['', '出会い', '知り合い', '仲間', '親友', '特別'];

export default function EmotionIndicator({ emotion, level }: EmotionIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-lg">{emotionEmojis[emotion] || '😊'}</span>
      <div className="flex items-center gap-1">
        <span className="text-purple-400 font-medium">Lv.{level}</span>
        <span className="text-gray-400">{levelNames[level] || ''}</span>
      </div>
    </div>
  );
}
