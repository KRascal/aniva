/* ────────────────────────────────── CSS animations ── */

export const MOMENT_CARD_STYLES = `
  @keyframes floatHeart {
    0%   { transform: translateY(0) scale(1);   opacity: 1; }
    60%  { transform: translateY(-60px) scale(1.3); opacity: 0.9; }
    100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
  }
  @keyframes heartBurst {
    0%   { transform: scale(0.4); opacity: 0; }
    30%  { transform: scale(1.4); opacity: 1; }
    60%  { transform: scale(1.0); opacity: 1; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  @keyframes likePopIn {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.6); }
    60%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  .like-pop { animation: likePopIn 0.4s cubic-bezier(0.22,1,0.36,1); }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  @keyframes quickChatPulse {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.05); }
    70%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @keyframes bubbleExpand {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.4); }
    65%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  .quick-chat-pulse { animation: quickChatPulse 0.45s cubic-bezier(0.22,1,0.36,1); }
  .quick-chat-bubble { animation: bubbleExpand 0.4s cubic-bezier(0.22,1,0.36,1); }
`;
