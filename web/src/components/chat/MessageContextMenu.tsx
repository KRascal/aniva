'use client';

interface CtxMenu {
  msgId: string;
  content: string;
}

interface Props {
  ctxMenu: CtxMenu | null;
  onClose: () => void;
  onCopy: (content: string) => void;
  onBookmark: (msgId: string, content: string) => void;
  onShare: (content: string) => void;
}

export function MessageContextMenu({ ctxMenu, onClose, onCopy, onBookmark, onShare }: Props) {
  if (!ctxMenu) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-white/10 rounded-2xl shadow-2xl p-1 min-w-[160px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onCopy(ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">📋</span>
          <span>コピー</span>
        </button>
        <button
          onClick={() => onBookmark(ctxMenu.msgId, ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">🔖</span>
          <span>ブックマーク</span>
        </button>
        <button
          onClick={() => onShare(ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">🔗</span>
          <span>シェア</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-gray-400 text-sm text-left"
        >
          <span className="text-lg">✕</span>
          <span>閉じる</span>
        </button>
      </div>
    </div>
  );
}
