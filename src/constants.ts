import type { Difficulty, Vibe } from './types';

export const LOADING_PHRASES = [
  'Consulting the archives...',
  'Distilling core arguments...',
  'Applying aesthetic filters...',
  'Mapping semantic territories...',
  'Calibrating narrative resonance...',
  'Extracting intellectual diamonds...',
  'Weaving the editorial tapestry...',
  'Interrogating the source material...',
  'Synthesizing key insights...',
  'Polishing the masterpiece...',
  'Channeling the chosen persona...',
  'Curating pull quotes...',
  'Structuring the narrative arc...',
  'Decoding hidden patterns...',
  'Applying the finishing touches...',
];

export const DIFFICULTY_DATA: Record<Difficulty, { name: string; description: string; icon: string; color: string }> = {
  high_school: {
    name: 'High School',
    description: 'Basic multiple-choice questions testing core comprehension.',
    icon: '📝',
    color: 'emerald',
  },
  college: {
    name: 'College Student',
    description: 'Short-answer questions requiring conceptual understanding.',
    icon: '🎓',
    color: 'blue',
  },
  executive: {
    name: 'Executive Challenge',
    description: 'Real-world application problems demanding strategic thinking.',
    icon: '💼',
    color: 'violet',
  },
  irate_boss: {
    name: 'Irate Boss Mode',
    description: 'Highly aggressive, high-pressure interrogation. Not for the faint-hearted.',
    icon: '😤',
    color: 'rose',
  },
};

export const VIBE_DATA: Record<Vibe, { name: string; description: string; preview: string }> = {
  CLASSIC: {
    name: 'Classic',
    description: 'Serif typography, warm off-white tones, timeless elegance.',
    preview: 'Aa',
  },
  AVANT_GARDE: {
    name: 'Avant-Garde',
    description: 'Brutalist black/white, monospace fonts, neon accents.',
    preview: '//Aa',
  },
  MINIMALIST: {
    name: 'Minimalist',
    description: 'Clean sans-serif, generous whitespace, pure function.',
    preview: 'Aa',
  },
};
