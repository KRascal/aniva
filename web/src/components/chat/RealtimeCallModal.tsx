'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface RealtimeCallModalProps {
  characterId: string;
  characterName: string;
  characterAvatar: string | null;
  onClose: () => void;
}

type CallState = 'connecting' | 'connected' | 'ended' | 'error';

/**
 * Grok Voice Agent API（WebSocket双方向）によるリアルタイム音声通話
 * → 100ms未満のレイテンシで自然な会話体験
 */
export function RealtimeCallModal({
  characterId,
  characterName,
  characterAvatar,
  onClose,
}: RealtimeCallModalProps) {
  const [callState, setCallState] = useState<CallState>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playBufferRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const isActiveRef = useRef(true);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // PCM16 base64 → Float32Array
  const decodeAudio = useCallback((base64: string): Float32Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  }, []);

  // 音声再生キュー
  const playNextBuffer = useCallback(() => {
    if (!audioContextRef.current || playBufferRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    isPlayingRef.current = true;
    setIsSpeaking(true);

    const data = playBufferRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, data.length, 24000);
    buffer.getChannelData(0).set(data);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => playNextBuffer();
    source.start();
  }, []);

  // Float32Array → PCM16 base64
  const encodeAudio = useCallback((float32: Float32Array): string => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }, []);

  // WebSocket接続 & マイク開始
  const startCall = useCallback(async () => {
    try {
      // 1. ephemeral token取得
      const sessionRes = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      if (!sessionRes.ok) {
        throw new Error(`Session failed: ${sessionRes.status}`);
      }
      const { ephemeralToken, instructions, voice, wsUrl } = await sessionRes.json();

      // 2. AudioContext初期化
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      // 3. マイク取得
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      // 4. WebSocket接続（ephemeral token使用）
      const token = typeof ephemeralToken === 'string' ? ephemeralToken : JSON.stringify(ephemeralToken);
      const ws = new WebSocket(wsUrl, [`xai-client-secret.${token}`]);
      wsRef.current = ws;

      ws.onopen = () => {
        // session.update でキャラ設定を送信
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice,
            instructions,
            audio: {
              input: { format: { type: 'audio/pcm', rate: 24000 } },
              output: { format: { type: 'audio/pcm', rate: 24000 } },
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));

        setCallState('connected');

        // マイク音声をWebSocketに送信
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isActiveRef.current || isMuted) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const encoded = encodeAudio(inputData);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded,
            }));
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        if (!isActiveRef.current) return;
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'response.audio.delta':
              // 音声データ受信 → 再生キューに追加
              if (data.delta) {
                const audioData = decodeAudio(data.delta);
                playBufferRef.current.push(audioData);
                if (!isPlayingRef.current) playNextBuffer();
              }
              break;

            case 'response.audio_transcript.delta':
              // キャラの発話テキスト（リアルタイム）
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant') {
                  return [...prev.slice(0, -1), { role: 'assistant', text: last.text + (data.delta || '') }];
                }
                return [...prev, { role: 'assistant', text: data.delta || '' }];
              });
              break;

            case 'conversation.item.input_audio_transcription.completed':
              // ユーザーの発話テキスト
              if (data.transcript) {
                setTranscript(prev => [...prev, { role: 'user', text: data.transcript }]);
              }
              break;

            case 'input_audio_buffer.speech_started':
              setIsListening(true);
              break;

            case 'input_audio_buffer.speech_stopped':
              setIsListening(false);
              break;

            case 'error':
              console.error('[RealtimeCall] Error:', data.error);
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        setCallState('error');
        setErrorMsg('接続エラーが発生しました');
      };

      ws.onclose = () => {
        if (isActiveRef.current) {
          setCallState('ended');
        }
      };

      // タイマー開始
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('[RealtimeCall] Start error:', err);
      setCallState('error');
      setErrorMsg(err instanceof Error ? err.message : '通話を開始できませんでした');
    }
  }, [characterId, isMuted, encodeAudio, decodeAudio, playNextBuffer]);

  // 通話終了
  const endCall = useCallback(() => {
    isActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (wsRef.current) wsRef.current.close();
    if (processorRef.current) processorRef.current.disconnect();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setCallState('ended');
  }, []);

  useEffect(() => {
    startCall();
    return () => {
      isActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* 背景グラデーション */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.15) 0%, rgba(0,0,0,1) 70%)`,
        }}
      />

      {/* 音声波動エフェクト */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute rounded-full border border-purple-400/20"
              style={{
                width: `${120 + i * 60}px`,
                height: `${120 + i * 60}px`,
                animation: `voiceRing ${1 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {/* アバター */}
        <div className={`relative ${isSpeaking ? 'animate-pulse' : ''}`}>
          <div
            className="w-28 h-28 rounded-full overflow-hidden border-2"
            style={{
              borderColor: callState === 'connected'
                ? isSpeaking ? '#a855f7' : '#22c55e'
                : '#6b7280',
              boxShadow: isSpeaking ? '0 0 30px rgba(168,85,247,0.5)' : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            {characterAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl">
                🎭
              </div>
            )}
          </div>
          {/* 状態ドット */}
          <div
            className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-black"
            style={{
              backgroundColor: callState === 'connected' ? '#22c55e' : callState === 'connecting' ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>

        {/* キャラ名 + 状態 */}
        <div className="text-center">
          <h2 className="text-white text-xl font-bold">{characterName}</h2>
          <p className="text-white/50 text-sm mt-1">
            {callState === 'connecting' && '接続中…'}
            {callState === 'connected' && (isSpeaking ? `${characterName}が話してる…` : isListening ? '聴いてるよ…' : formatDuration(duration))}
            {callState === 'ended' && '通話終了'}
            {callState === 'error' && (errorMsg || 'エラー')}
          </p>
          {callState === 'connected' && (
            <p className="text-purple-400/60 text-xs mt-1">
              🔴 LIVE · リアルタイム音声
            </p>
          )}
        </div>

        {/* リアルタイムトランスクリプト */}
        {transcript.length > 0 && (
          <div className="w-full max-w-sm max-h-32 overflow-y-auto rounded-xl bg-white/5 p-3 space-y-1 border border-white/5">
            {transcript.slice(-4).map((t, i) => (
              <p key={i} className={`text-xs ${t.role === 'user' ? 'text-blue-300 text-right' : 'text-purple-300'}`}>
                {t.role === 'user' ? '🎤 ' : `${characterName}: `}{t.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* コントロールバー */}
      <div className="relative z-10 flex items-center justify-center gap-8 pb-12 pt-6">
        {/* ミュート */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-red-500/30 border-2 border-red-500' : 'bg-white/10 border border-white/20'
          }`}
        >
          <span className="text-xl">{isMuted ? '🔇' : '🎤'}</span>
        </button>

        {/* 切断 */}
        <button
          onClick={() => { endCall(); onClose(); }}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-90 transition-transform"
        >
          <span className="text-2xl">📵</span>
        </button>

        {/* スピーカー */}
        <button
          onClick={() => {/* future: speaker toggle */}}
          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
        >
          <span className="text-xl">🔊</span>
        </button>
      </div>

      {/* アニメーション */}
      <style>{`
        @keyframes voiceRing {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
