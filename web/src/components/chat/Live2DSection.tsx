'use client';

import Live2DViewer from '../live2d/Live2DViewer';

interface Live2DSectionProps {
  isViewerExpanded: boolean;
  currentEmotion: string;
  isSending: boolean;
  avatarUrl?: string;
  characterName?: string;
  onCollapse: () => void;
}

export function Live2DSection({ isViewerExpanded, currentEmotion, isSending, avatarUrl, characterName, onCollapse }: Live2DSectionProps) {
  if (!isViewerExpanded) return null;

  return (
    <div className="flex-shrink-0 viewer-slide overflow-hidden">
      <div className="flex flex-col items-center py-3 bg-gradient-to-b from-gray-900/90 to-gray-900 border-b border-gray-800/60">
        <Live2DViewer
          emotion={currentEmotion}
          isSpeaking={isSending}
          avatarUrl={avatarUrl}
          characterName={characterName}
          width={200}
          height={240}
        />
        {/* 閉じるバー */}
        <button
          onClick={onCollapse}
          className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span>縮小する</span>
        </button>
      </div>
    </div>
  );
}
