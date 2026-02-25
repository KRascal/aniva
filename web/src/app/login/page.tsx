'use client';

import { signIn } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/* ─── Floating particle element ─── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={style}
    />
  );
}

/* ─── Particle field – pure CSS animations ─── */
function ParticleField() {
  const particles = [
    // Large soft orbs
    { width: 6, height: 6, left: '12%', top: '18%', background: 'rgba(192,132,252,0.9)', animation: 'floatOrb 7s ease-in-out infinite', animationDelay: '0s', boxShadow: '0 0 12px 4px rgba(192,132,252,0.6)' },
    { width: 4, height: 4, left: '78%', top: '25%', background: 'rgba(244,114,182,0.9)', animation: 'floatOrb 9s ease-in-out infinite', animationDelay: '-3s', boxShadow: '0 0 10px 3px rgba(244,114,182,0.5)' },
    { width: 3, height: 3, left: '55%', top: '70%', background: 'rgba(251,146,60,0.9)', animation: 'floatOrb 8s ease-in-out infinite', animationDelay: '-6s', boxShadow: '0 0 8px 2px rgba(251,146,60,0.5)' },
    { width: 5, height: 5, left: '30%', top: '60%', background: 'rgba(167,139,250,0.9)', animation: 'floatOrb 10s ease-in-out infinite', animationDelay: '-2s', boxShadow: '0 0 12px 3px rgba(167,139,250,0.5)' },
    { width: 2, height: 2, left: '88%', top: '55%', background: 'rgba(249,168,212,0.9)', animation: 'floatOrb 6s ease-in-out infinite', animationDelay: '-4s', boxShadow: '0 0 6px 2px rgba(249,168,212,0.5)' },
    { width: 4, height: 4, left: '5%', top: '75%', background: 'rgba(251,191,36,0.8)', animation: 'floatOrb 11s ease-in-out infinite', animationDelay: '-7s', boxShadow: '0 0 10px 3px rgba(251,191,36,0.4)' },
    { width: 3, height: 3, left: '65%', top: '15%', background: 'rgba(196,181,253,0.9)', animation: 'floatOrb 8.5s ease-in-out infinite', animationDelay: '-1.5s', boxShadow: '0 0 8px 2px rgba(196,181,253,0.5)' },
    { width: 2, height: 2, left: '42%', top: '35%', background: 'rgba(253,186,116,0.9)', animation: 'floatOrb 7.5s ease-in-out infinite', animationDelay: '-5s', boxShadow: '0 0 6px 2px rgba(253,186,116,0.4)' },
    // Drift particles
    { width: 1.5, height: 1.5, left: '20%', top: '45%', background: 'rgba(216,180,254,0.7)', animation: 'drift 14s linear infinite', animationDelay: '0s' },
    { width: 1.5, height: 1.5, left: '70%', top: '80%', background: 'rgba(251,207,232,0.7)', animation: 'drift 18s linear infinite', animationDelay: '-6s' },
    { width: 1, height: 1, left: '45%', top: '10%', background: 'rgba(253,230,138,0.7)', animation: 'drift 12s linear infinite', animationDelay: '-3s' },
    { width: 1, height: 1, left: '90%', top: '35%', background: 'rgba(167,243,208,0.7)', animation: 'drift 16s linear infinite', animationDelay: '-9s' },
    { width: 2, height: 2, left: '8%', top: '40%', background: 'rgba(196,181,253,0.8)', animation: 'drift 20s linear infinite', animationDelay: '-12s' },
    { width: 1.5, height: 1.5, left: '58%', top: '50%', background: 'rgba(249,168,212,0.7)', animation: 'drift 15s linear infinite', animationDelay: '-4s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <Particle
          key={i}
          style={{
            width: p.width,
            height: p.height,
            left: p.left,
            top: p.top,
            background: p.background,
            animation: p.animation,
            animationDelay: p.animationDelay,
            boxShadow: (p as { boxShadow?: string }).boxShadow ?? undefined,
          }}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/explore';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(errorParam === 'invite_only' ? '🔒 招待制サービスのため、招待コードが必要です。招待リンクからアクセスしてください。' : '');
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
      setTimeout(() => codeRefs[0].current?.focus(), 100);
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
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
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError('コードが無効か期限切れです。再送信してください。');
      setIsLoading(false);
    } else {
      window.location.href = result?.url || callbackUrl;
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
    <>
      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.8; }
          33%       { transform: translateY(-18px) scale(1.15); opacity: 1; }
          66%       { transform: translateY(10px) scale(0.9); opacity: 0.7; }
        }
        @keyframes drift {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(30px) rotate(360deg); opacity: 0; }
        }
        @keyframes titleShimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes titlePulse {
          0%, 100% { text-shadow: 0 0 20px rgba(192,132,252,0.5), 0 0 40px rgba(244,114,182,0.3); }
          50%       { text-shadow: 0 0 30px rgba(192,132,252,0.8), 0 0 60px rgba(244,114,182,0.5), 0 0 90px rgba(251,146,60,0.3); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(236,72,153,0.2); }
          50%       { box-shadow: 0 0 30px rgba(168,85,247,0.7), 0 0 60px rgba(236,72,153,0.4), 0 0 90px rgba(251,146,60,0.2); }
        }
        @keyframes bgRotate {
          0%   { transform: rotate(0deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1.2); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .aniva-title {
          background: linear-gradient(135deg, #c084fc, #f472b6, #fb923c, #f472b6, #c084fc);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: titleShimmer 4s ease infinite, titlePulse 3s ease-in-out infinite;
          display: inline-block;
        }
        .btn-glow {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .btn-glow::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .btn-glow:hover::before { opacity: 1; }
        .btn-glow:hover {
          transform: translateY(-2px);
          animation: glowPulse 2s ease-in-out infinite;
        }
        .btn-glow:active { transform: translateY(0) scale(0.97); }

        .google-btn {
          transition: all 0.3s ease;
        }
        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255,255,255,0.2);
        }
        .google-btn:active { transform: translateY(0) scale(0.97); }

        .card-enter {
          animation: fadeSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .code-input {
          transition: all 0.2s ease;
        }
        .code-input:focus {
          box-shadow: 0 0 0 2px rgba(168,85,247,0.6), 0 0 15px rgba(168,85,247,0.3);
          transform: scale(1.05);
        }

        .bg-cone {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        @keyframes blobDrift1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(40px,-30px) scale(1.1); }
          66%  { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-50px,30px) scale(1.05); }
        }
        @keyframes blobDrift3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%  { transform: translate(30px,-40px) scale(1.08); }
          80%  { transform: translate(-40px,10px) scale(0.92); }
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #06000f 0%, #0d0020 40%, #12000a 70%, #0a0300 100%)' }}
      >
        {/* ── Animated background blobs ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Primary large orb */}
          <div
            className="bg-cone"
            style={{
              width: 800, height: 800,
              top: '-20%', left: '50%', marginLeft: -400,
              background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(168,85,247,0.1) 50%, transparent 70%)',
              animation: 'blobDrift1 12s ease-in-out infinite',
            }}
          />
          {/* Pink accent */}
          <div
            className="bg-cone"
            style={{
              width: 600, height: 600,
              bottom: '-10%', right: '-10%',
              background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, rgba(244,114,182,0.08) 50%, transparent 70%)',
              animation: 'blobDrift2 15s ease-in-out infinite',
            }}
          />
          {/* Orange warm */}
          <div
            className="bg-cone"
            style={{
              width: 500, height: 500,
              bottom: '10%', left: '-5%',
              background: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)',
              animation: 'blobDrift3 18s ease-in-out infinite',
            }}
          />
          {/* Top-right subtle */}
          <div
            className="bg-cone"
            style={{
              width: 400, height: 400,
              top: '5%', right: '5%',
              background: 'radial-gradient(circle, rgba(196,181,253,0.12) 0%, transparent 70%)',
              animation: 'blobDrift1 20s ease-in-out infinite reverse',
            }}
          />

          {/* Radial vignette */}
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)' }}
          />
        </div>

        {/* ── Floating Particles ── */}
        <ParticleField />

        {/* ── Decorative constellation lines ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="20%" x2="30%" y2="45%" stroke="rgba(192,132,252,1)" strokeWidth="0.5" />
          <line x1="30%" y1="45%" x2="55%" y2="30%" stroke="rgba(192,132,252,1)" strokeWidth="0.5" />
          <line x1="55%" y1="30%" x2="78%" y2="55%" stroke="rgba(244,114,182,1)" strokeWidth="0.5" />
          <line x1="78%" y1="55%" x2="88%" y2="25%" stroke="rgba(244,114,182,1)" strokeWidth="0.5" />
          <line x1="12%" y1="75%" x2="42%" y2="60%" stroke="rgba(251,146,60,1)" strokeWidth="0.5" />
          <line x1="42%" y1="60%" x2="65%" y2="72%" stroke="rgba(251,146,60,1)" strokeWidth="0.5" />
          <circle cx="10%" cy="20%" r="2" fill="rgba(192,132,252,0.8)" />
          <circle cx="30%" cy="45%" r="1.5" fill="rgba(192,132,252,0.8)" />
          <circle cx="55%" cy="30%" r="2" fill="rgba(244,114,182,0.8)" />
          <circle cx="78%" cy="55%" r="1.5" fill="rgba(244,114,182,0.8)" />
          <circle cx="88%" cy="25%" r="2" fill="rgba(196,181,253,0.8)" />
          <circle cx="12%" cy="75%" r="1.5" fill="rgba(251,146,60,0.8)" />
          <circle cx="42%" cy="60%" r="2" fill="rgba(251,146,60,0.8)" />
          <circle cx="65%" cy="72%" r="1.5" fill="rgba(253,186,116,0.8)" />
        </svg>

        {/* ── Main card ── */}
        <div className="relative z-10 max-w-md w-full mx-4 card-enter">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block mb-2">
              <span className="aniva-title text-6xl font-black tracking-widest">ANIVA</span>
            </div>
            <p className="text-purple-200/70 text-sm font-medium tracking-wider">
              {step === 'email' ? '— おかえりなさい —' : '— コードを確認してください —'}
            </p>

            {/* Decorative star row */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-transparent to-purple-500/40" />
              <span className="text-purple-400/60 text-xs">✦</span>
              <span className="text-pink-400/80 text-xs">✦</span>
              <span className="text-orange-400/60 text-xs">✦</span>
              <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-transparent to-purple-500/40" />
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === 'email'
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg shadow-purple-900/60'
                    : 'bg-green-500/20 text-green-400 border border-green-500/40'
                }`}>
                  {step === 'email' ? '1' : '✓'}
                </div>
                <span className={`text-xs font-medium tracking-wide ${step === 'email' ? 'text-white' : 'text-gray-500'}`}>メール</span>
              </div>
              <div className={`h-px w-8 transition-all duration-500 ${step === 'code' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === 'code'
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg shadow-purple-900/60'
                    : 'bg-white/8 text-gray-500'
                }`}>
                  2
                </div>
                <span className={`text-xs font-medium tracking-wide ${step === 'code' ? 'text-white' : 'text-gray-600'}`}>認証コード</span>
              </div>
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8 border"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderColor: 'rgba(255,255,255,0.10)',
              boxShadow: '0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {step === 'email' && (
              <>
                {/* Google OAuth - Primary CTA */}
                <button
                  onClick={() => signIn('google', { callbackUrl })}
                  className="google-btn w-full py-4 bg-white text-gray-900 rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-black/30 mb-6"
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
                    <div className="w-full border-t border-white/8" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 text-gray-500" style={{ background: 'transparent' }}>またはメールアドレスで</span>
                  </div>
                </div>

                {/* Invite-only notice */}
                {errorParam === 'invite_only' && (
                  <div className="mb-4 p-4 rounded-2xl border"
                    style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}
                  >
                    <p className="text-amber-300 text-sm text-center font-medium">🔒 招待制サービスです</p>
                    <p className="text-amber-200/60 text-xs text-center mt-1">招待リンクから登録してください</p>
                  </div>
                )}

                {/* Email OTP form */}
                <form onSubmit={handleSendCode} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
                    className="w-full px-4 py-4 rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.15), 0 0 20px rgba(168,85,247,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = ''; }}
                    required
                    autoFocus
                  />
                  {error && errorParam !== 'invite_only' && (
                    <div className="p-3 rounded-xl border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="btn-glow w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)',
                      boxShadow: '0 4px 20px rgba(139,92,246,0.4), 0 0 40px rgba(219,39,119,0.2)',
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        送信中...
                      </span>
                    ) : '推しに会いに行く ✨'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  アカウントをお持ちでない方も{' '}
                  <span className="text-purple-400/80">自動で登録されます</span>
                </p>
              </>
            )}

            {step === 'code' && (
              <>
                <p className="text-center text-gray-300 text-sm mb-1">
                  <span className="text-purple-300 font-medium">{email}</span>
                </p>
                <p className="text-center text-gray-500 text-xs mb-6">
                  に6桁のコードを送信しました（10分間有効）
                </p>

                {/* Debug code display */}
                {debugCode && (
                  <div className="mb-6 p-3 rounded-xl text-center border" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.25)' }}>
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
                        className="code-input w-12 h-14 text-center text-2xl font-bold rounded-xl text-white focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      />
                    ))}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                      <p className="text-red-400 text-sm text-center">⚠️ {error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || codeDigits.join('').length !== 6}
                    className="btn-glow w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)',
                      boxShadow: '0 4px 20px rgba(139,92,246,0.4), 0 0 40px rgba(219,39,119,0.2)',
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        認証中...
                      </span>
                    ) : '認証する ✨'}
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
                      className="text-purple-400 hover:text-pink-400 text-sm underline underline-offset-2 transition-colors duration-200 disabled:opacity-50"
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

          <p className="mt-6 text-center text-[10px] text-gray-700 leading-relaxed">
            利用することで
            <Link href="/terms" className="text-purple-500/60 underline hover:text-purple-400/80 transition-colors">利用規約</Link>
            と
            <Link href="/privacy" className="text-purple-500/60 underline hover:text-purple-400/80 transition-colors">プライバシーポリシー</Link>
            に同意したものとみなされます
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #06000f 0%, #0d0020 40%, #12000a 70%, #0a0300 100%)' }} />}>
      <LoginForm />
    </Suspense>
  );
}
