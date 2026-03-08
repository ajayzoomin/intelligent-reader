import { useRef, useCallback } from 'react';
import type { Vibe } from '../types';
import { vc } from '../utils/themes';

// ── Color controls exposed to the rest of the app ────────────────────────────

export const COLOR_CONTROLS = [
  { key: '--theme-bg',           icon: '▣', label: 'Page Background',    dim: false },
  { key: '--theme-surface',      icon: '◫', label: 'Card / Sidebar BG',  dim: false },
  { key: '--theme-title',        icon: 'T', label: 'Article Title',       dim: false },
  { key: '--theme-heading',      icon: 'H', label: 'Section Headings',    dim: false },
  { key: '--theme-text',         icon: 'T', label: 'Body Text',           dim: false },
  { key: '--theme-insight-text', icon: 'T', label: 'Key Insights Text',   dim: false },
  { key: '--theme-text-muted',   icon: 'T', label: 'Muted / Captions',    dim: true  },
  { key: '--theme-accent',       icon: '✦', label: 'Accent & Highlights', dim: false },
  { key: '--theme-accent-text',  icon: 'T', label: 'Text on Accent',      dim: true  },
  { key: '--theme-border',       icon: '—', label: 'Borders & Dividers',  dim: false },
] as const;

export type ThemeColorKey = typeof COLOR_CONTROLS[number]['key'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read the computed CSS variable value from :root (set by applyTheme).
 * Clamps to a valid 6-digit hex string required by <input type="color">.
 */
function readCSSVar(key: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  if (/^#[0-9a-f]{6}$/i.test(val)) return val;
  if (/^#[0-9a-f]{3}$/i.test(val))
    return '#' + val.slice(1).split('').map((c) => c + c).join('');
  return '#888888';
}

// ── Single swatch ─────────────────────────────────────────────────────────────

function Swatch({
  colorKey,
  icon,
  label,
  dim,
  currentColor,
  isFocused,
  isHovered,
  vibe,
  onChange,
}: {
  colorKey: string;
  icon: string;
  label: string;
  dim: boolean;
  currentColor: string;
  isFocused: boolean;
  isHovered: boolean;
  vibe: Vibe;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const iconClass = vc(vibe, {
    CLASSIC:   'text-[var(--theme-text-muted)]',
    AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)]/80',
    MINIMALIST: 'text-[var(--theme-text-muted)]',
  });

  return (
    <div
      className="flex items-center gap-[5px] flex-shrink-0 group cursor-pointer select-none"
      title={label}
      onClick={() => inputRef.current?.click()}
    >
      {/* Icon */}
      <span
        className={`text-[11px] leading-none transition-opacity ${iconClass} ${
          dim ? 'opacity-40' : 'opacity-70'
        } group-hover:opacity-100`}
      >
        {icon}
      </span>

      {/* Color dot */}
      <button
        type="button"
        className={`w-[17px] h-[17px] rounded-full border-2 transition-all
          hover:scale-125 active:scale-95 cursor-pointer
          ${isFocused
            ? 'ring-[3px] ring-blue-400 ring-offset-[2px] ring-offset-black scale-125 border-blue-300'
            : isHovered
            ? 'ring-[2px] ring-amber-300/80 ring-offset-[1px] ring-offset-black scale-110 border-amber-200/60'
            : 'border-white/25 group-hover:border-white/60'
          }`}
        style={{ backgroundColor: currentColor }}
        title={`Change ${label}`}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      />

      {/* Native color picker (hidden) */}
      <input
        ref={inputRef}
        type="color"
        value={currentColor}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label={label}
      />
    </div>
  );
}

// ── Main bar ──────────────────────────────────────────────────────────────────

interface Props {
  colorOverrides: Record<string, string>;
  onColorChange: (key: ThemeColorKey, value: string) => void;
  focusedKey: string | null;
  hoveredKey: string | null;
  vibe: Vibe;
}

export default function ColorControlBar({ colorOverrides, onColorChange, focusedKey, hoveredKey, vibe }: Props) {
  const getColor = useCallback(
    (key: ThemeColorKey): string => colorOverrides[key] ?? readCSSVar(key),
    [colorOverrides]
  );

  const barBg = vc(vibe, {
    CLASSIC:     'bg-[var(--theme-surface)]/95 border-[var(--theme-border)]',
    AVANT_GARDE: 'bg-black/96 border-[var(--theme-accent)]/20',
    MINIMALIST:  'bg-white/96 border-[var(--theme-border)]',
  });

  const labelClass = vc(vibe, {
    CLASSIC:     'font-playfair italic text-[var(--theme-text-muted)]',
    AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)]/50',
    MINIMALIST:  'font-inter text-[var(--theme-text-muted)]',
  });

  const hintClass = vc(vibe, {
    CLASSIC:     'text-[var(--theme-text-muted)]',
    AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)]/30',
    MINIMALIST:  'text-[var(--theme-text-muted)]',
  });

  return (
    <div
      className={`border-b backdrop-blur-xl px-5 py-[7px] flex items-center gap-3 overflow-x-auto ${barBg}`}
    >
      {/* "STYLE" label */}
      <span className={`text-[9px] tracking-[0.2em] uppercase flex-shrink-0 ${labelClass}`}>
        Style
      </span>

      {/* Vertical separator */}
      <div className="w-px h-[14px] bg-current opacity-15 flex-shrink-0" />

      {/* Swatches */}
      <div className="flex items-center gap-[14px]">
        {COLOR_CONTROLS.map((ctrl) => (
          <Swatch
            key={ctrl.key}
            colorKey={ctrl.key}
            icon={ctrl.icon}
            label={ctrl.label}
            dim={ctrl.dim}
            currentColor={getColor(ctrl.key)}
            isFocused={focusedKey === ctrl.key}
            isHovered={hoveredKey === ctrl.key && focusedKey !== ctrl.key}
            vibe={vibe}
            onChange={(v) => onColorChange(ctrl.key as ThemeColorKey, v)}
          />
        ))}
      </div>

      {/* Right-side hint — only shown when something is focused */}
      <div className="ml-auto flex-shrink-0">
        {focusedKey ? (
          <span className={`text-[9px] tracking-wide animate-pulse ${hintClass}`}>
            ↑ Click the glowing swatch to change color
          </span>
        ) : hoveredKey ? (
          <span className={`text-[9px] tracking-wide ${hintClass}`}>
            Click to lock · click swatch to change
          </span>
        ) : (
          <span className={`text-[9px] tracking-wide opacity-30 ${hintClass}`}>
            Hover any element to target its color
          </span>
        )}
      </div>
    </div>
  );
}
