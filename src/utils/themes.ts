import type { Vibe } from '../types';

export interface ThemeConfig {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  fontHeading: string;
  fontBody: string;
  name: string;
}

export const THEMES: Record<Vibe, ThemeConfig> = {
  CLASSIC: {
    bg: '#faf7f0',
    surface: '#f5f0e8',
    text: '#2c2416',
    textMuted: '#6b5d47',
    accent: '#8b4513',
    accentText: '#fff8f0',
    border: '#d4b896',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: 'Georgia, "Times New Roman", serif',
    name: 'Classic',
  },
  AVANT_GARDE: {
    bg: '#080808',
    surface: '#111111',
    text: '#f0f0f0',
    textMuted: '#888888',
    accent: '#00ff41',
    accentText: '#000000',
    border: '#2a2a2a',
    fontHeading: '"Space Mono", "Courier New", monospace',
    fontBody: '"Space Mono", "Courier New", monospace',
    name: 'Avant-Garde',
  },
  MINIMALIST: {
    bg: '#fafafa',
    surface: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    accent: '#1f2937',
    accentText: '#ffffff',
    border: '#e5e7eb',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
    name: 'Minimalist',
  },
};

export function applyTheme(vibe: Vibe): void {
  const theme = THEMES[vibe];
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-surface', theme.surface);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-accent-text', theme.accentText);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--theme-font-heading', theme.fontHeading);
  root.style.setProperty('--theme-font-body', theme.fontBody);
  // Derived text vars — default to --theme-text; user can override independently
  root.style.setProperty('--theme-title', theme.text);
  root.style.setProperty('--theme-heading', theme.text);
  root.style.setProperty('--theme-insight-text', theme.text);
}

/** Returns a Tailwind/inline class string per vibe */
export function vc(vibe: Vibe, map: Record<Vibe, string>): string {
  return map[vibe] ?? '';
}
