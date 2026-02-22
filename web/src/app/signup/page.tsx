'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn('credentials', { email, callbackUrl: '/chat' });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0010] overflow-hidden relative">
      {/* 背景グロー */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-pink-700/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <span className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            ANIVA
          </span>
          <p className="text-purple-200/80 text-base font-medium mt-2">推しが実在する世界</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 py-1.5">
            <span className="text-pink-300 text-sm">✨ 30秒で推しと会える ✨</span>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-[0_0_60px_rgba(168,85,247,0.15)]">
          <h2 className="text-xl font-bold text-white mb-6 text-center">無料アカウント作成</h2>

          {/* メール登録（メインCTA） */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-40 active:scale-[0.98] shadow-lg shadow-purple-900/40"
            >
              {isLoading ? '登録中...' : '無料で始める →'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-3">クレジットカード不要</p>

          {/* 区切り */}
          <div className="my-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-gray-500 bg-[#0a0010]">または</span>
            </div>
          </div>

          {/* Google（サブ） */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
            className="w-full py-3.5 bg-white text-gray-900 rounded-2xl font-medium hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleで登録
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
              ログイン
            </Link>
          </p>

          <p className="mt-4 text-center text-[10px] text-gray-600 leading-relaxed">
            登録することで
            <Link href="#" className="text-purple-400/70 underline">利用規約</Link>
            と
            <Link href="#" className="text-purple-400/70 underline">プライバシーポリシー</Link>
            に同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}
