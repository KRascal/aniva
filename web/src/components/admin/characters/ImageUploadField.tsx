'use client';

import React, { useRef, useState } from 'react';

export function ImageUploadField({
  label,
  value,
  onChange,
  slug,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  slug: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadFile = async (file: File) => {
    setUploadError('');
    if (!slug) {
      setUploadError('先にスラッグを入力してください');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slug', slug);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'アップロードに失敗しました');
      } else {
        onChange(data.url);
      }
    } catch {
      setUploadError('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={className}>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center gap-1
          border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer
          transition-colors select-none
          ${dragging
            ? 'border-purple-500 bg-purple-900/20'
            : 'border-gray-600 hover:border-purple-500/60 hover:bg-gray-800/60'}
          ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-purple-400 text-sm py-1">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            アップロード中...
          </div>
        ) : (
          <>
            {/* Thumbnail preview */}
            {value && (
              <img
                src={value}
                alt="preview"
                className="w-20 h-20 object-cover rounded mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="text-gray-400 text-xs text-center">
              画像をドロップ or クリックしてアップロード
            </span>
            <span className="text-gray-600 text-xs">jpg / png / webp / gif ・ 最大 5MB</span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {uploadError && (
        <p className="text-red-400 text-xs mt-1">{uploadError}</p>
      )}

      {/* Manual URL input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="または URL を直接入力"
        className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
