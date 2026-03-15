/* ─────────────── 共通スタイル（keyframes） ─────────────── */
export const GLOBAL_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sendBounce {
    0%   { transform: scale(1); }
    25%  { transform: scale(0.82); }
    60%  { transform: scale(1.18); }
    80%  { transform: scale(0.94); }
    100% { transform: scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
    50%       { box-shadow: 0 0 16px 4px rgba(168,85,247,0.55); }
  }
  @keyframes viewerSlide {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 340px; }
  }
  @keyframes audioSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  /* 波形アニメーション（各バーが独立したリズムで動く） */
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }
  /* 感情アニメーション */
  @keyframes bubbleShake {
    0%, 100% { transform: translateX(0); }
    15%, 55%  { transform: translateX(-5px) rotate(-1deg); }
    30%, 70%  { transform: translateX(5px) rotate(1deg); }
    45%, 85%  { transform: translateX(-3px); }
  }
  @keyframes bubbleWiggle {
    0%, 100% { transform: rotate(-2deg) scale(1.02); }
    50%       { transform: rotate(2deg) scale(1.04); }
  }
  @keyframes floatMeat {
    0%   { opacity: 1; transform: translateY(0) scale(1) rotate(-5deg); }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(-130px) scale(1.5) rotate(15deg); }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
    40%       { opacity: 1; transform: scale(1.3) rotate(120deg); }
    80%       { opacity: 0.5; transform: scale(0.8) rotate(240deg); }
  }
  @keyframes levelUpBanner {
    0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
    15%  { opacity: 1; transform: translateY(0) scale(1.05); }
    85%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
  }
  .wave-bar {
    display: inline-block;
    width: 3px;
    border-radius: 2px;
    transform-origin: bottom;
    animation: waveBar 0.8s ease-in-out infinite;
  }
  .msg-animate       { animation: fadeInUp 0.32s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes inputFlash {
    0% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6); }
    50% { box-shadow: 0 0 20px 4px rgba(168,85,247,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
  }
  .input-flash { animation: inputFlash 0.5s ease-out; }
  .send-bounce       { animation: sendBounce 0.38s ease-out; }
  .send-glow         { animation: glowPulse 1.6s ease-in-out infinite; }
  .viewer-slide      { animation: viewerSlide 0.3s ease-out; }
  .audio-spin        { animation: audioSpin 1.4s linear infinite; }
  .bubble-angry      { animation: bubbleShake 0.5s ease-in-out; }
  .bubble-excited    { animation: bubbleWiggle 0.5s ease-in-out 3; }
  .bubble-levelup    { animation: levelUpBanner 3.5s ease-in-out forwards; }
  .float-meat        { animation: floatMeat 1.6s ease-out forwards; }
  .star-twinkle      { animation: starTwinkle 1.2s ease-in-out infinite; }
  /* Thin custom scrollbar */
  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  /* テーマカラー背景の滑らかなトランジション */
  .chat-bg { transition: background 1.2s ease; }
  /* 絆XPフロートアニメーション */
  @keyframes xpFloatUp {
    0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
    15%  { opacity: 1; transform: translateY(-6px) scale(1.05); }
    60%  { opacity: 0.9; transform: translateY(-18px) scale(1); }
    100% { opacity: 0; transform: translateY(-36px) scale(0.9); }
  }
  /* ---- 新規感情吹き出しアニメーション ---- */
  /* 照れ: 左右に小さく揺れ */
  @keyframes bubbleShyWiggle {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-3px); }
    40%       { transform: translateX(3px); }
    60%       { transform: translateX(-2px); }
    80%       { transform: translateX(2px); }
  }
  /* 悲しみ: 全体がゆっくりフェードイン */
  @keyframes bubbleSadFade {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 0.88; transform: translateY(0); }
  }
  /* 寂しい: わずかに小さく出現 */
  @keyframes bubbleLonelyIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(0.97); }
  }
  /* 興奮スパークル */
  @keyframes sparkleFloat1 {
    0%   { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
    30%  { opacity: 1; transform: translate(-8px, -12px) scale(1.1) rotate(60deg); }
    100% { opacity: 0; transform: translate(-4px, -26px) scale(0.5) rotate(140deg); }
  }
  @keyframes sparkleFloat2 {
    0%   { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
    40%  { opacity: 1; transform: translate(10px, -10px) scale(1.0) rotate(-45deg); }
    100% { opacity: 0; transform: translate(6px, -24px) scale(0.5) rotate(-120deg); }
  }
  .bubble-shy {
    animation: bubbleShyWiggle 0.7s ease-in-out;
    box-shadow: 0 0 0 1px rgba(236,72,153,0.25), 0 4px 16px rgba(236,72,153,0.12) !important;
  }
  .bubble-sad {
    animation: bubbleSadFade 0.8s ease-out forwards;
  }
  .bubble-lonely {
    animation: bubbleLonelyIn 0.6s ease-out forwards;
  }
  .sparkle-1 {
    position: absolute;
    top: -4px; right: 4px;
    font-size: 11px;
    pointer-events: none;
    animation: sparkleFloat1 1.1s ease-out forwards;
    z-index: 10;
    user-select: none;
  }
  .sparkle-2 {
    position: absolute;
    top: 2px; right: -8px;
    font-size: 10px;
    pointer-events: none;
    animation: sparkleFloat2 1.1s ease-out forwards;
    animation-delay: 0.2s;
    opacity: 0;
    z-index: 10;
    user-select: none;
  }
`;
