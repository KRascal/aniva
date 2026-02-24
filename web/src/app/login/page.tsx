'use client';

import { signIn } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(errorParam === 'invite_only' ? '招待コードが必要です' : '');
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      if (data.debugCode) {
        setDebugCode(data.debugCode);
      }

      setStep('code');
      setCountdown(60);
      // Focus first input on next tick
      setTimeout(() => codeRefs[0].current?.focus(), 100);
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    // Handle paste of full 6-digit code
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const digits = value.split('');
      setCodeDigits(digits);
      codeRefs[5].current?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);

    if (digit && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join('');
    if (code.length !== 6) {
      setError('6桁のコードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      code,
      callbackUrl: '/explore',
      redirect: false,
    });

    if (result?.error) {
      setError('コードが無効か期限切れです。再送信してください。');
      setIsLoading(false);
    } else {
      window.location.href = result?.url || '/explore';
    }
  };

  const handleResend = async () => {
    setCodeDigits(['', '', '', '', '', '']);
    setDebugCode(null);
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.debugCode) setDebugCode(data.debugCode);
      setCountdown(60);
      codeRefs[0].current?.focus();
    } catch {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0010] overflow-hidden relative">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-pink-700/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            ANIVA
          </span>
          <p className="text-purple-200/80 text-base font-medium mt-2">
            {step === 'email' ? 'おかえりなさい 👋' : 'コードを確認してください 📩'}
          </p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-[0_0_60px_rgba(168,85,247,0.15)]">

          {step === 'email' && (
            <>
              {/* Google OAuth - Primary CTA */}
              <button
                onClick={() => signIn('google', { callbackUrl: '/explore' })}
                className="w-full py-4 bg-white text-gray-900 rounded-2xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleで始める
              </button>

              <div className="my-5 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 text-gray-500 bg-[#0a0010]">またはメールアドレスで</span>
                </div>
              </div>

              {/* Email OTP form */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  required
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? '送信中...' : '推しに会いに行く →'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                アカウントをお持ちでない方も{' '}
                <span className="text-purple-400">自動で登録されます</span>
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <p className="text-center text-gray-300 text-sm mb-2">
                <span className="text-purple-300 font-medium">{email}</span>
              </p>
              <p className="text-center text-gray-500 text-xs mb-6">
                に6桁のコードを送信しました（10分間有効）
              </p>

              {/* Debug code display */}
              {debugCode && (
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                  <p className="text-yellow-400 text-xs mb-1">🔧 デバッグモード — 認証コード:</p>
                  <p className="text-yellow-300 text-2xl font-mono font-bold tracking-[0.3em]">{debugCode}</p>
                </div>
              )}

              {/* 6-digit code inputs */}
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex gap-2 justify-center">
                  {codeDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={codeRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || codeDigits.join('').length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? '認証中...' : '認証する ✨'}
                </button>
              </form>

              {/* Resend */}
              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-gray-500 text-sm">{countdown}秒後に再送信できます</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-purple-400 hover:text-purple-300 text-sm underline disabled:opacity-50"
                  >
                    コードを再送信
                  </button>
                )}
              </div>

              <button
                onClick={() => { setStep('email'); setError(''); setCodeDigits(['', '', '', '', '', '']); }}
                className="mt-4 w-full text-center text-gray-500 text-xs hover:text-gray-400 transition-colors"
              >
                ← メールアドレスを変更
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-gray-600 leading-relaxed">
          利用することで
          <Link href="/terms" className="text-purple-400/70 underline">利用規約</Link>
          と
          <Link href="/privacy" className="text-purple-400/70 underline">プライバシーポリシー</Link>
          に同意したものとみなされます
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0010]" />}>
      <LoginForm />
    </Suspense>
  );
}
