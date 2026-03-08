/**
 * ANIVA Design System — Design Tokens
 * 全コンポーネントで統一されたビジュアル言語を定義
 *
 * Usage:
 *   import { colors, spacing, typography, shadows, animations } from '@/lib/design-tokens';
 *   <div style={{ background: colors.surface.primary }}>
 *   <p className={typography.heading.lg}>
 */

// ─── Colors ──────────────────────────────────────────────────
export const colors = {
  // Brand
  brand: {
    primary: '#8B5CF6',     // purple-500
    secondary: '#EC4899',   // pink-500
    accent: '#F59E0B',      // amber-500
    gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
    gradientAlt: 'linear-gradient(135deg, #7C3AED, #DB2777)',
  },

  // Surface / Background
  surface: {
    primary: '#000000',     // app background
    secondary: '#111827',   // gray-900
    tertiary: '#1F2937',    // gray-800
    card: 'rgba(17, 24, 39, 0.7)', // with backdrop-blur
    elevated: '#1F2937',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
    muted: 'rgba(255, 255, 255, 0.25)',
    inverse: '#111827',
    brand: '#A78BFA',       // purple-400
    link: '#818CF8',        // indigo-400
  },

  // State
  state: {
    success: '#10B981',     // emerald-500
    warning: '#F59E0B',     // amber-500
    error: '#EF4444',       // red-500
    info: '#3B82F6',        // blue-500
  },

  // Rarity
  rarity: {
    N: '#6B7280',
    R: '#3B82F6',
    SR: '#8B5CF6',
    SSR: '#FBBF24',
    UR: '#F472B6',
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.2)',
    brand: 'rgba(139, 92, 246, 0.3)',
  },
} as const;

// ─── Typography (Tailwind class names) ───────────────────────
export const typography = {
  heading: {
    xl: 'text-2xl font-bold tracking-tight',
    lg: 'text-xl font-bold tracking-tight',
    md: 'text-lg font-bold',
    sm: 'text-base font-bold',
  },
  body: {
    lg: 'text-base leading-relaxed',
    md: 'text-sm leading-relaxed',
    sm: 'text-xs leading-relaxed',
  },
  label: {
    lg: 'text-sm font-semibold uppercase tracking-wider',
    md: 'text-xs font-semibold uppercase tracking-wider',
    sm: 'text-[10px] font-bold uppercase tracking-widest',
  },
  mono: 'font-mono text-sm',
} as const;

// ─── Spacing ─────────────────────────────────────────────────
export const spacing = {
  page: {
    x: 'px-4',               // page horizontal padding
    y: 'py-4',               // page vertical padding
    top: 'pt-4',
    bottom: 'pb-24',         // room for BottomNav
  },
  section: 'mb-6',           // between sections
  card: {
    padding: 'p-4',
    gap: 'gap-3',
  },
  inline: 'gap-2',           // between inline elements
} as const;

// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
  sm: 'shadow-sm shadow-black/20',
  md: 'shadow-md shadow-black/30',
  lg: 'shadow-lg shadow-black/40',
  xl: 'shadow-xl shadow-black/50',
  glow: {
    purple: 'shadow-lg shadow-purple-500/30',
    pink: 'shadow-lg shadow-pink-500/30',
    amber: 'shadow-lg shadow-amber-500/30',
  },
} as const;

// ─── Radius ──────────────────────────────────────────────────
export const radius = {
  sm: 'rounded-lg',          // 8px
  md: 'rounded-xl',          // 12px
  lg: 'rounded-2xl',         // 16px
  xl: 'rounded-3xl',         // 24px
  full: 'rounded-full',
} as const;

// ─── Animation Durations ─────────────────────────────────────
export const animations = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  enter: 'duration-300 ease-out',
  exit: 'duration-200 ease-in',
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────
export const zIndex = {
  base: 0,
  card: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

// ─── Breakpoints (for JS usage) ──────────────────────────────
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
