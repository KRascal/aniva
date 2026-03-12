export interface SoulData {
  coreIdentity: string;
  motivation: string;
  worldview: string;
  timelinePosition: string | null;
  backstory: string | null;
  relationshipMap: Record<string, unknown>;
  personalityAxes: Record<string, unknown>;
  emotionalPatterns: Record<string, unknown>;
}

export interface QuoteData {
  id: string;
  quote: string;
  context: string | null;
  emotion: string | null;
  episode: string | null;
  category: string;
  importance: number;
}

export interface BoundaryData {
  id: string;
  rule: string;
  category: string;
  severity: string;
  example: string | null;
  reason: string | null;
}

export interface VoiceData {
  firstPerson: string;
  secondPerson: string;
  sentenceEndings: string[];
  exclamations: string[];
  laughStyle: string | null;
  angryStyle: string | null;
  sadStyle: string | null;
  toneNotes: string | null;
  speechExamples: { user: string; char: string }[];
}

export interface CharacterMeta {
  id: string;
  name: string;
  slug: string;
}

export type TabKey = 'soul' | 'quotes' | 'boundaries' | 'voice';

export type ToastFn = (msg: string, type: 'success' | 'error') => void;
