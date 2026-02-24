'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CallModalProps {
  characterId: string;
  characterName: string;
  characterAvatar: string | null;
  onClose: () => void;
}

type CallState = 'calling' | 'connected' | 'ended';

export function CallModal({ characterId, characterName, characterAvatar, onClose }: CallModalProps) {
  const [callState, setCallState] = useState<CallState>('calling');
  const [duration, setDuration] = useState(0);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('発信中...');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(true);

  // 接続シミュレーション (1.5秒後に接続)
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      if (!isActiveRef.current) return;
      setCallState('connected');
      setStatusText('通話中');
    }, 1500);
    return () => clearTimeout(connectTimer);
  }, []);

  // タイマー
  useEffect(() => {
    if (callState !== 'connected') return;
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 音声再生
  const playAudio = useCallback(async (audioUrl: string) => {
    if (!isActiveRef.current) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setIsSpeaking(true);
    audio.onended = () => {
      if (!isActiveRef.current) return;
      setIsSpeaking(false);
      // 再生終了後、再度リスニング開始
      startListening();
    };
    if (isSpeakerOn) {
      audio.play().catch(() => setIsSpeaking(false));
    } else {
      setIsSpeaking(false);
    }
  }, [isSpeakerOn]);

  // キャラクターに送信して応答取得
  const sendToCharacter = useCallback(async (text: string) => {
    if (!isActiveRef.current || !text.trim()) return;
    setIsListening(false);
    setIsSpeaking(true);
    setStatusText('応答中...');

    try {
      // チャット送信
      const chatRes = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, message: text }),
      });

      if (!chatRes.ok || !isActiveRef.current) {
        setIsSpeaking(false);
        setStatusText('通話中');
        startListening();
        return;
      }

      const chatData = await chatRes.json();
      const replyText = chatData.characterMessage?.content ?? '';

      if (!replyText || !isActiveRef.current) {
        setIsSpeaking(false);
        setStatusText('通話中');
        startListening();
        return;
      }

      // 音声生成
      const voiceRes = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: chatData.characterMessage.id,
          text: replyText,
          characterId,
        }),
      });

      if (!isActiveRef.current) return;

      if (voiceRes.ok) {
        const voiceData = await voiceRes.json();
        if (voiceData.audioUrl && isActiveRef.current) {
          setStatusText('通話中');
          await playAudio(voiceData.audioUrl);
          return;
        }
      }

      // 音声なしの場合はそのままリスニング再開
      setIsSpeaking(false);
      setStatusText('通話中');
      startListening();
    } catch {
      if (!isActiveRef.current) return;
      setIsSpeaking(false);
      setStatusText('通話中');
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, isSpeakerOn, playAudio]);

  // 音声認識開始
  const startListening = useCallback(() => {
    if (!isActiveRef.current || !isMicOn || callState !== 'connected') return;

    const SpeechRecognitionCtor: (new () => SpeechRecognition) | undefined =
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      if (!isActiveRef.current) return;
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript && isActiveRef.current) {
        sendToCharacter(transcript);
      }
    };

    recognition.onerror = () => {
      if (!isActiveRef.current) return;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!isActiveRef.current) return;
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isMicOn, callState, sendToCharacter]);

  // 接続後にリスニング開始
  useEffect(() => {
    if (callState === 'connected') {
      const timer = setTimeout(() => startListening(), 500);
      return () => clearTimeout(timer);
    }
  }, [callState, startListening]);

  const handleEndCall = useCallback(() => {
    isActiveRef.current = false;
    setCallState('ended');
    setStatusText('通話終了');
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTimeout(() => onClose(), 800);
  }, [onClose]);

  const toggleMic = () => {
    setIsMicOn((prev) => {
      if (prev && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      return !prev;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-gray-900 via-black to-gray-950"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
    >
      {/* 上部：ステータス + キャラ情報 */}
      <div className="flex flex-col items-center mt-16 gap-6 w-full px-8">
        {/* ステータステキスト */}
        <p className="text-gray-400 text-sm tracking-widest animate-pulse">
          {statusText}
        </p>

        {/* アバター（話している時はリング点滅） */}
        <div className={`relative ${isSpeaking ? 'animate-pulse' : ''}`}>
          {/* 外側リング */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-500 ${
              isSpeaking
                ? 'ring-4 ring-purple-500/60 scale-110'
                : isListening
                ? 'ring-4 ring-green-500/60 scale-105'
                : 'ring-2 ring-white/20'
            }`}
            style={{ borderRadius: '50%', margin: '-8px' }}
          />
          <div className="w-36 h-36 rounded-full overflow-hidden shadow-2xl border-2 border-white/10">
            {characterAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-5xl">
                🏴‍☠️
              </div>
            )}
          </div>
        </div>

        {/* キャラ名 */}
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">{characterName}</h2>
          {callState === 'connected' && (
            <p className="text-purple-400 text-lg mt-1 font-mono">{formatDuration(duration)}</p>
          )}
        </div>

        {/* 音声認識ビジュアル */}
        {callState === 'connected' && (
          <div className="flex items-center gap-2 h-8">
            {isListening ? (
              <>
                <span className="text-green-400 text-sm">🎤 聞いています...</span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animation: `waveBar ${0.4 + i * 0.1}s ease-in-out infinite`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : isSpeaking ? (
              <>
                <span className="text-purple-400 text-sm">💬 話しています...</span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-purple-400 rounded-full"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animation: `waveBar ${0.4 + i * 0.1}s ease-in-out infinite`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <span className="text-gray-500 text-sm">タップして話す</span>
            )}
          </div>
        )}
      </div>

      {/* 下部：コントロールボタン */}
      <div className="flex flex-col items-center gap-8 w-full px-8">
        {/* マイク / スピーカー ボタン */}
        <div className="flex items-center gap-10">
          {/* マイクボタン */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleMic}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isMicOn
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {isMicOn ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>
            <span className="text-xs text-gray-500">{isMicOn ? 'マイク' : 'ミュート'}</span>
          </div>

          {/* スピーカーボタン */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsSpeakerOn((v) => !v)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isSpeakerOn
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSpeakerOn ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M6.343 9.657a8 8 0 000 4.686" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
            </button>
            <span className="text-xs text-gray-500">{isSpeakerOn ? 'スピーカー' : 'OFF'}</span>
          </div>
        </div>

        {/* 終話ボタン（赤丸） */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleEndCall}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/50 transition-all active:scale-95"
          >
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>
          <span className="text-xs text-gray-500">終話</span>
        </div>
      </div>

      {/* Web Speech API 非対応の場合のメッセージ */}
      {callState === 'connected' && typeof window !== 'undefined' && !(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
        <div className="absolute bottom-40 left-0 right-0 text-center">
          <p className="text-xs text-amber-400/60">このブラウザは音声認識に対応していません</p>
        </div>
      )}

      {/* waveBar アニメーション定義 */}
      <style>{`
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
