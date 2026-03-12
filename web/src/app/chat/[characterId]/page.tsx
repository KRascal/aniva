'use client';

import { useRouter } from 'next/navigation';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { Message } from '@/components/chat/ChatMessageList';
import { OnboardingOverlay } from '@/components/chat/OnboardingOverlay';
import { RealtimeCallModal } from '@/components/chat/RealtimeCallModal';
import { GiftPanel } from '@/components/chat/GiftPanel';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { WelcomeBackOverlay } from '@/components/chat/WelcomeBackOverlay';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { ChatInput } from '@/components/chat/ChatInput';
import { FcSubscribeModal } from '@/components/chat/FcSubscribeModal';
import { PushNotificationSetup } from '@/components/push/PushNotificationSetup';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { EndingMessage } from '@/components/chat/EndingMessage';
import { StreakBreakPopup } from '@/components/chat/StreakBreakPopup';
import { DailyEventPopup } from '@/components/reward/DailyEventPopup';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { MemoryPeekModal, CallSelectModal, FcSuccessModal, MessageContextMenu } from '@/components/chat/ChatModals';
import { GLOBAL_STYLES } from './chat-constants';
import { useChatCore } from './useChatCore';

/* ─────────────── メインページ ─────────────── */
export default function ChatCharacterPage() {
  const c = useChatCore();

  if (c.status === 'loading' || c.isLoadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            {c.character?.avatarUrl && (
              <img src={c.character.avatarUrl} alt="" className="absolute inset-2 rounded-full object-cover" />
            )}
          </div>
          <p className="text-gray-400 text-sm animate-pulse">
            {c.character ? `${c.character.name}と繋いでいる...` : '読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  const level = c.relationship?.level ?? 1;

  return (
    <div
      className={`flex flex-col h-[calc(100dvh-4rem)] min-h-dvh max-w-lg mx-auto relative chat-bg ${c.isNightMode ? 'night-mode' : ''}`}
      style={{
        background: c.charBgGradient ? `radial-gradient(ellipse at top, ${c.bgTheme}), ${c.charBgGradient}` : `radial-gradient(ellipse at top, ${c.bgTheme}), #111827`,
        ...(c.isNightMode ? { filter: 'brightness(0.85) saturate(0.9)', transition: 'filter 0.5s ease' } : {}),
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* 感情アンビエントグロー */}
      {c.currentEmotion && c.currentEmotion !== 'neutral' && (
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
          style={{
            opacity: 0.15,
            background: {
              excited: 'radial-gradient(ellipse at bottom, rgba(251,146,60,0.4) 0%, transparent 70%)',
              happy: 'radial-gradient(ellipse at bottom, rgba(250,204,21,0.3) 0%, transparent 70%)',
              angry: 'radial-gradient(ellipse at bottom, rgba(239,68,68,0.4) 0%, transparent 60%)',
              sad: 'radial-gradient(ellipse at bottom, rgba(59,130,246,0.3) 0%, transparent 70%)',
              love: 'radial-gradient(ellipse at bottom, rgba(236,72,153,0.4) 0%, transparent 70%)',
              shy: 'radial-gradient(ellipse at bottom, rgba(244,114,182,0.3) 0%, transparent 70%)',
              surprised: 'radial-gradient(ellipse at bottom, rgba(34,211,238,0.3) 0%, transparent 70%)',
              jealous: 'radial-gradient(ellipse at bottom, rgba(168,85,247,0.3) 0%, transparent 70%)',
              lonely: 'radial-gradient(ellipse at bottom, rgba(139,92,246,0.3) 0%, transparent 70%)',
              teasing: 'radial-gradient(ellipse at bottom, rgba(167,139,250,0.3) 0%, transparent 70%)',
              proud: 'radial-gradient(ellipse at bottom, rgba(245,158,11,0.3) 0%, transparent 70%)',
              motivated: 'radial-gradient(ellipse at bottom, rgba(249,115,22,0.3) 0%, transparent 70%)',
            }[c.currentEmotion] || 'none',
          }}
        />
      )}

      {/* 深夜モード */}
      {c.isNightMode && (
        <div className="fixed top-20 right-3 z-40 text-[10px] text-purple-400/60 flex items-center gap-1 pointer-events-none select-none bg-gray-950/60 rounded-full px-2 py-0.5 backdrop-blur-sm">
          <span>🌙</span> <span>おやすみモード</span>
        </div>
      )}

      {/* オンボーディング */}
      {c.showOnboarding && c.character && (
        <OnboardingOverlay character={c.character} onStart={c.handleStartChat} />
      )}

      {/* ギフトパネル */}
      {c.character && (
        <GiftPanel
          characterId={c.characterId}
          characterName={c.character.name}
          isOpen={c.showGift}
          onClose={() => c.setShowGift(false)}
          onGiftSent={c.handleGiftSent}
        />
      )}

      {/* 通話モーダル */}
      {c.showCall && c.character && (
        <RealtimeCallModal
          characterId={c.characterId}
          characterName={c.character.name}
          characterAvatar={c.character.avatarUrl}
          onClose={() => c.setShowCall(false)}
        />
      )}

      {/* 記憶ペークモーダル */}
      {c.showMemoryPeek && (
        <MemoryPeekModal
          character={c.character}
          memoryData={c.memoryData}
          memoryLoading={c.memoryLoading}
          onClose={() => c.setShowMemoryPeek(false)}
        />
      )}

      {/* 準備中トースト */}
      {c.showComingSoonToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl"
          style={{ background: 'rgba(30,20,60,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(139,92,246,0.4)' }}>
          <span>📞</span>
          <span>通話機能は近日公開予定です</span>
        </div>
      )}

      {/* 通話選択モーダル */}
      {c.showCallModal && (
        <CallSelectModal
          character={c.character}
          onClose={() => c.setShowCallModal(false)}
          onCallToast={() => { c.setCallToast(true); setTimeout(() => c.setCallToast(false), 3000); }}
        />
      )}

      {/* メニュー */}
      <ChatMenu
        character={c.character}
        relationship={c.relationship}
        characterId={c.characterId}
        isOpen={c.showMenu}
        onClose={() => c.setShowMenu(false)}
      />

      {/* 通話準備中トースト */}
      {c.callToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          この機能は近日公開予定です
        </div>
      )}

      {/* 復帰演出 */}
      {c.showWelcomeBack && c.character && (
        <WelcomeBackOverlay
          characterName={c.character.name}
          characterAvatarUrl={c.character.avatarUrl ?? null}
          daysSinceLastChat={c.daysSinceLastChat}
          onDismiss={() => c.setShowWelcomeBack(false)}
        />
      )}

      {/* ストリーク途切れ */}
      {c.showStreakBreak && c.character && c.relationship && (
        <StreakBreakPopup
          characterSlug={c.character.slug ?? 'luffy'}
          characterName={c.character.name}
          relationshipId={c.relationshipId ?? ''}
          previousStreak={c.relationship.streakDays ?? 0}
          onClose={() => c.setShowStreakBreak(false)}
          onRecovered={c.handleStreakRecovered}
        />
      )}

      {/* FC加入完了モーダル */}
      {c.showFcSuccess && c.character && (
        <FcSuccessModal
          character={c.character}
          onClose={() => c.setShowFcSuccess(false)}
        />
      )}

      {/* FC加入ポップアップ */}
      {c.showFcModal && c.character && (
        <FcSubscribeModal
          characterName={c.character.name}
          characterAvatar={c.character.avatarUrl ?? undefined}
          fcMonthlyPriceJpy={c.character.fcMonthlyPriceJpy ?? 3480}
          fcIncludedCallMin={c.character.fcIncludedCallMin ?? 30}
          fcMonthlyCoins={c.character.fcMonthlyCoins ?? 500}
          onClose={() => c.setShowFcModal(false)}
          onSubscribe={c.handleFcSubscribe}
        />
      )}

      {/* レベルアップモーダル */}
      {c.levelUpData && (
        <LevelUpModal
          newLevel={c.levelUpData.newLevel}
          levelName={RELATIONSHIP_LEVELS[Math.min(c.levelUpData.newLevel - 1, RELATIONSHIP_LEVELS.length - 1)].name}
          milestone={c.levelUpData.milestone}
          onClose={() => c.setLevelUpData(null)}
        />
      )}

      {/* デイリーイベント: good トースト */}
      {c.showDailyEvent && c.dailyEvent && c.dailyEvent.eventType === 'good' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          style={{ animation: 'fadeInUp 0.5s ease-out' }}
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl px-8 py-6 text-center border border-amber-400/60 pointer-events-auto"
            style={{ boxShadow: '0 0 40px rgba(251,191,36,0.3)', animation: 'glowPulse 2s ease-in-out infinite' }}
          >
            <div className="text-2xl font-bold mb-2 text-amber-400">✨ 今日はいい日！</div>
            <div className="text-gray-300 text-sm">{c.dailyEvent.message || c.dailyEvent.greeting || 'キャラのテンションが特別高い日！'}</div>
            {c.dailyEvent.bonusCoins && (
              <div className="mt-3 text-amber-400 font-semibold">+{c.dailyEvent.bonusCoins} コイン獲得！</div>
            )}
          </div>
        </div>
      )}

      {/* デイリーイベント: rare / ultra_rare */}
      {c.showDailyEvent && c.dailyEvent && (c.dailyEvent.eventType === 'rare' || c.dailyEvent.eventType === 'ultra_rare') && (
        <DailyEventPopup
          eventType={c.dailyEvent.eventType as 'rare' | 'ultra_rare'}
          message={c.dailyEvent.message ?? ''}
          characterGreeting={c.dailyEvent.greeting ?? undefined}
          bonusCoins={c.dailyEvent.bonusCoins}
          bonusXpMultiplier={c.dailyEvent.bonusXpMultiplier}
          onClose={() => c.setShowDailyEvent(false)}
        />
      )}

      {/* ══════════════ ヘッダー ══════════════ */}
      <ChatHeader
        character={c.character}
        relationship={c.relationship}
        presence={c.presence}
        characterId={c.characterId}
        isLateNight={c.isLateNight}
        onBack={() => c.router.push('/chat')}
        onCallClick={() => {
          c.setShowComingSoonToast(true);
          setTimeout(() => c.setShowComingSoonToast(false), 2500);
        }}
        onMenuClick={() => c.setShowMenu(true)}
        onMemoryClick={c.openMemoryPeek}
        onProfileClick={() => c.router.push(`/profile/${c.characterId}`)}
        onFcClick={() => c.setShowFcModal(true)}
        proactiveUnreadCount={c.charProactiveUnread}
      />

      {/* ══════════════ プロアクティブメッセージバナー ══════════════ */}
      {c.proactiveMessages.filter(m => m.characterId === c.characterId && !m.isRead).map(msg => (
        <div
          key={msg.id}
          className="mx-3 my-1 p-2.5 bg-purple-900/30 border border-purple-500/20 rounded-2xl cursor-pointer hover:bg-purple-900/50 transition-colors"
          onClick={async () => { await c.markProactiveRead(msg.id); }}
        >
          <p className="text-sm text-purple-200/80">{msg.content}</p>
          <CountdownTimer expiresAt={msg.expiresAt} className="mt-1" />
        </div>
      ))}

      {/* ══════════════ 共有トピック ══════════════ */}
      {c.relationship?.sharedTopics && c.relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 px-3 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-gray-600 flex-shrink-0">覚えてること:</span>
            {c.relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-xs bg-purple-900/30 text-purple-400/70 px-1.5 py-0.5 rounded-full"
              >
                {topic.type === 'like' ? '💜' : '📝'} {topic.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ Live2D ビューアー ══════════════ */}
      {c.isViewerExpanded && (
        <div className="flex-shrink-0 viewer-slide overflow-hidden">
          <div className="flex flex-col items-center py-3 bg-gradient-to-b from-gray-900/90 to-gray-900 border-b border-gray-800/60">
            <Live2DViewer
              emotion={c.currentEmotion}
              isSpeaking={c.isSending}
              avatarUrl={c.character?.avatarUrl ?? undefined}
              characterName={c.character?.name ?? undefined}
              width={200}
              height={240}
            />
            <button
              onClick={() => c.setIsViewerExpanded(false)}
              className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>縮小する</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ ランダムイベント ══════════════ */}
      {c.randomEvent && (
        <div className="mx-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{c.randomEvent.emoji}</span>
            <div>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider">{c.randomEvent.title}</p>
              <p className="text-sm text-white/80 italic">「{c.randomEvent.message}」</p>
              {c.randomEvent.coinReward && (
                <p className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-0.5"><CoinIcon size={14} /> +{c.randomEvent.coinReward} コイン</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ 不在バナー ══════════════ */}
      {c.presence && !c.presence.isAvailable && !c.absenceBannerDismissed && (
        <div className="mx-4 mt-2 flex items-start gap-3 bg-gray-800/80 border border-gray-700/60 rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0 text-2xl mt-0.5">{c.presence.statusEmoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-300">
              {c.character?.name ?? 'キャラクター'}は今 <span className="text-yellow-400">{c.presence.status}</span>
            </p>
            {c.presence.statusMessage && (
              <p className="text-xs text-gray-500 mt-0.5 italic">「{c.presence.statusMessage}」</p>
            )}
            <p className="text-xs text-gray-600 mt-1">メッセージは届くよ。後で返事が来るかも 📩</p>
          </div>
          <button
            onClick={() => c.setAbsenceBannerDismissed(true)}
            className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ══════════════ メッセージリスト ══════════════ */}
      <ChatMessageList
        messages={c.messages}
        character={c.character}
        isSending={c.isSending}
        lastEmotionMsgId={c.lastEmotionMsgId}
        playingAudioId={c.playingAudioId}
        hungryEmojis={c.hungryEmojis}
        heartEmojis={c.heartEmojis}
        showStars={c.showStars}
        messagesEndRef={c.messagesEndRef}
        onAudioToggle={c.handleAudioToggle}
        onMsgLongPressStart={c.handleMsgLongPressStart}
        onMsgLongPressEnd={c.handleMsgLongPressEnd}
        onCtxMenu={(msgId, content) => c.setCtxMenu({ msgId, content })}
        onFcClick={() => c.setShowFcModal(true)}
        onReaction={c.handleReaction}
        currentEmotion={c.currentEmotion}
      />

      {/* ══════════════ エンディングメッセージ ══════════════ */}
      {c.endingMessage && c.character && (
        <div className="px-4 pb-2">
          <EndingMessage
            content={c.endingMessage.content}
            characterName={c.character.name}
            characterAvatarUrl={c.character.avatarUrl}
            onAnimationComplete={() => {
              setTimeout(() => c.setEndingMessage(null), 5000);
            }}
          />
        </div>
      )}

      {/* ══════════════ 入力エリア ══════════════ */}

      {/* モーメント話題カード */}
      {c.topicCardVisible && c.topicText && c.character && (
        <div className="px-3 pb-2">
          <div className="relative bg-purple-900/30 border border-purple-500/30 rounded-2xl p-3 flex items-start gap-3">
            <button
              className="absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors"
              onClick={() => { c.setTopicCardVisible(false); c.setInputText(''); }}
              aria-label="話題カードを閉じる"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/40">
              {c.character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.character.avatarUrl} alt={c.character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                  {c.character.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 mr-5">
              <p className="text-purple-300 text-[10px] font-semibold mb-1">📸 タイムラインの話題</p>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{c.topicText}</p>
              <button
                className="mt-2 flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95"
                onClick={() => {
                  c.setTopicCardVisible(false);
                  c.handleSendClick();
                }}
              >
                この話題で話す →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プッシュ通知バナー */}
      {c.character && (
        <PushNotificationSetup
          characterName={c.character.name}
          characterSlug={c.character.slug}
          variant="banner"
        />
      )}

      <ChatInput
        inputText={c.inputText}
        setInputText={c.setInputText}
        onSend={c.handleSendClick}
        onSendImage={c.handleSendImage}
        onSendSticker={c.handleSendSticker}
        isSending={c.isSending}
        isGreeting={c.isGreeting}
        character={c.character}
        characterId={c.characterId}
        coinBalance={c.coinBalance}
        relationship={c.relationship}
        inputRef={c.inputRef}
        isSendBouncing={c.isSendBouncing}
        isLateNight={c.isLateNight}
        placeholderIndex={c.placeholderIndex}
        showPlusMenu={c.showPlusMenu}
        setShowPlusMenu={c.setShowPlusMenu}
        onGift={() => c.setShowGift(true)}
        onFcClick={() => c.setShowFcModal(true)}
        handleKeyDown={c.handleKeyDown}
        lastCharacterMessage={
          [...c.messages].reverse().find((m: Message) => m.role === 'CHARACTER')?.content ?? undefined
        }
      />

      {/* コンテキストメニュー */}
      {c.ctxMenu && (
        <MessageContextMenu
          ctxMenu={c.ctxMenu}
          onCopy={c.handleCopyMsg}
          onBookmark={c.handleBookmarkMsg}
          onShare={(content) => {
            if (navigator.share) {
              navigator.share({ text: content }).catch(() => {});
            } else {
              c.handleCopyMsg(content);
            }
            c.setCtxMenu(null);
          }}
          onClose={() => c.setCtxMenu(null)}
        />
      )}

      {/* 絆XPフロート */}
      {c.xpFloat && (
        <div
          key={c.xpFloat.id}
          className="fixed z-50 pointer-events-none select-none"
          style={{
            bottom: '120px',
            right: '20px',
            animation: 'xpFloatUp 2s ease-out forwards',
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(219,39,119,0.9))',
              boxShadow: '0 2px 12px rgba(124,58,237,0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-sm">💫</span>
            <span className="text-white font-black text-sm">+{c.xpFloat.amount} XP</span>
          </div>
        </div>
      )}

      {/* シェアトースト */}
      {c.shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          {c.shareToast}
        </div>
      )}
    </div>
  );
}
