import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MessageSquare, Dumbbell, RefreshCw, BookOpen, Minimize2 } from 'lucide-react';
import type { MasterpieceContent, Vibe } from '../types';
import { vc } from '../utils/themes';
import ColorControlBar from './ColorControlBar';
import type { ThemeColorKey } from './ColorControlBar';

interface MasterpieceViewProps {
  content: MasterpieceContent;
  vibe: Vibe;
  persona: string;
  onEnterGym: () => void;
  onOpenChat: () => void;
  onReExtract: () => void;
  onSimplify: () => void;
  isSimplifying: boolean;
  pageImages?: string[];
  colorOverrides: Record<string, string>;
  onColorChange: (key: ThemeColorKey, value: string) => void;
}

// ── Rich Paragraph (renders **bold**, *italics*, $LaTeX$ via ReactMarkdown) ────

/** Strips the <p> ReactMarkdown wraps around inline content so ::first-letter works. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripP = ({ children }: { children?: ReactNode; [key: string]: any }) => <>{children}</>;

function RichParagraph({ text, vibe, isFirst }: { text: string; vibe: Vibe; isFirst: boolean }) {
  if (!text.trim()) return null;

  const baseClass = vc(vibe, {
    CLASSIC: 'text-[1.05rem] text-[var(--theme-text)]',
    AVANT_GARDE: 'text-[0.92rem] text-[var(--theme-text)] tracking-wide',
    MINIMALIST: 'text-[1rem] text-[var(--theme-text)] font-light',
  });

  if (!isFirst) {
    return (
      <div className={`mb-5 leading-[1.9] ${baseClass}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: StripP }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  const dropCapClass = vc(vibe, {
    CLASSIC: 'drop-cap-classic',
    AVANT_GARDE: 'drop-cap-avant',
    MINIMALIST: 'drop-cap-minimal',
  });

  const sizeClass = vc(vibe, {
    CLASSIC: 'text-[1.05rem]',
    AVANT_GARDE: 'text-[0.92rem] tracking-wide',
    MINIMALIST: 'text-[1rem] font-light',
  });

  return (
    <div className={`mb-5 leading-[1.9] clearfix ${dropCapClass} ${sizeClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: StripP }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// ── Pull Quote ────────────────────────────────────────────────────────────────

function PullQuote({ quote, vibe }: { quote: string; vibe: Vibe }) {
  if (vibe === 'CLASSIC') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="my-12 mx-auto max-w-2xl"
        data-color-key="--theme-accent"
      >
        <div className="border-l-4 border-r-4 border-[var(--theme-accent)] px-8 py-6 text-center">
          <p className="font-playfair italic text-2xl md:text-3xl leading-tight text-[var(--theme-accent)]">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </motion.div>
    );
  }

  if (vibe === 'AVANT_GARDE') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="my-12 skew-card"
        data-color-key="--theme-accent"
      >
        <div className="skew-card-inner bg-[var(--theme-accent)] p-6 md:p-8">
          <p className="font-space-mono text-black text-sm md:text-base uppercase tracking-widest leading-relaxed">
            // {quote}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-10 py-6 border-t border-b border-[var(--theme-border)]"
      data-color-key="--theme-accent"
    >
      <p className="font-inter text-xl md:text-2xl font-light text-[var(--theme-text)] leading-tight text-center tracking-tight">
        {quote}
      </p>
    </motion.div>
  );
}

// ── Key Insights ──────────────────────────────────────────────────────────────

function KeyInsights({ insights, vibe }: { insights: string[]; vibe: Vibe }) {
  if (!Array.isArray(insights) || insights.length === 0) return null;

  return (
    <div
      data-color-key="--theme-surface"
      className={`rounded-2xl p-6 ${vc(vibe, {
        CLASSIC: 'bg-[var(--theme-surface)] border border-[var(--theme-border)]',
        AVANT_GARDE: 'bg-[var(--theme-surface)] border border-[var(--theme-accent)]/40',
        MINIMALIST: 'bg-[var(--theme-surface)] border border-[var(--theme-border)]',
      })}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen
          className={`w-4 h-4 ${vc(vibe, {
            CLASSIC: 'text-[var(--theme-accent)]',
            AVANT_GARDE: 'text-[var(--theme-accent)]',
            MINIMALIST: 'text-[var(--theme-text-muted)]',
          })}`}
        />
        <h3
          className={`text-xs uppercase tracking-widest font-semibold ${vc(vibe, {
            CLASSIC: 'font-playfair text-[var(--theme-accent)]',
            AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)]',
            MINIMALIST: 'font-inter text-[var(--theme-text-muted)]',
          })}`}
        >
          Key Insights
        </h3>
      </div>
      <ul className="space-y-3">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-3" data-color-key="--theme-insight-text">
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${vc(vibe, {
                CLASSIC: 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]',
                AVANT_GARDE: 'bg-[var(--theme-accent)] text-black font-space-mono',
                MINIMALIST: 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]',
              })}`}
            >
              {i + 1}
            </span>
            <p
              className={`text-sm leading-relaxed ${vc(vibe, {
                CLASSIC: 'text-[var(--theme-insight-text)] font-georgia',
                AVANT_GARDE: 'text-[var(--theme-insight-text)] font-space-mono text-xs tracking-wide',
                MINIMALIST: 'text-[var(--theme-insight-text)] font-inter font-light',
              })}`}
            >
              {insight}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  section,
  vibe,
  sectionIndex,
  pageImages,
}: {
  section: MasterpieceContent['sections'][0];
  vibe: Vibe;
  sectionIndex: number;
  pageImages: string[];
}) {
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
  const content = section.content || '';

  const hasFigure =
    section.figurePageIndex != null &&
    typeof section.figurePageIndex === 'number' &&
    pageImages[section.figurePageIndex] != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-16"
    >
      {/* Section heading */}
      {sectionIndex === 0 ? null : (
        <h2
          data-color-key={vibe === 'AVANT_GARDE' ? '--theme-accent' : '--theme-heading'}
          className={`mb-6 leading-tight ${vc(vibe, {
            CLASSIC: 'font-playfair font-bold text-3xl text-[var(--theme-heading)]',
            AVANT_GARDE:
              'font-space-mono font-bold text-xl uppercase tracking-[0.15em] text-[var(--theme-accent)] before:content-["//"] before:mr-2',
            MINIMALIST: 'font-inter font-semibold text-2xl text-[var(--theme-heading)] tracking-tight',
          })}`}
        >
          {section.heading}
        </h2>
      )}

      {/* Render paragraphs — each wrapped in a data-color-key div for click detection */}
      {paragraphs.length > 0 ? (
        paragraphs.map((para, i) => (
          <div key={i} data-color-key="--theme-text">
            <RichParagraph
              text={para}
              vibe={vibe}
              isFirst={i === 0 && sectionIndex === 0}
            />
          </div>
        ))
      ) : (
        <div className="masterpiece-prose" data-color-key="--theme-text">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {content}
          </ReactMarkdown>
        </div>
      )}

      {/* Extracted page figure */}
      {hasFigure && (
        <motion.figure
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`my-8 rounded-xl overflow-hidden border ${vc(vibe, {
            CLASSIC: 'border-[var(--theme-border)] shadow-md',
            AVANT_GARDE: 'border-[var(--theme-accent)]/40 shadow-[0_0_20px_rgba(0,255,65,0.1)]',
            MINIMALIST: 'border-[var(--theme-border)] shadow-sm',
          })}`}
          data-color-key="--theme-border"
        >
          <img
            src={pageImages[section.figurePageIndex as number]}
            alt={section.figureCaption || 'Figure from document'}
            className="w-full object-contain bg-white"
            loading="lazy"
          />
          {section.figureCaption && (
            <figcaption
              data-color-key="--theme-text-muted"
              className={`px-4 py-2 text-sm text-center ${vc(vibe, {
                CLASSIC: 'font-playfair italic text-[var(--theme-text-muted)] bg-[var(--theme-surface)]',
                AVANT_GARDE: 'font-space-mono text-xs text-[var(--theme-accent)]/70 bg-black',
                MINIMALIST: 'font-inter font-light text-[var(--theme-text-muted)] bg-[var(--theme-surface)]',
              })}`}
            >
              {section.figureCaption}
            </figcaption>
          )}
        </motion.figure>
      )}
    </motion.div>
  );
}

// ── Floating Action Bar ───────────────────────────────────────────────────────

function ActionBar({
  vibe,
  onOpenChat,
  onEnterGym,
  onReExtract,
  onSimplify,
  isSimplifying,
}: {
  vibe: Vibe;
  onOpenChat: () => void;
  onEnterGym: () => void;
  onReExtract: () => void;
  onSimplify: () => void;
  isSimplifying: boolean;
}) {
  const barBg = vc(vibe, {
    CLASSIC: 'bg-[#2c2416]/90 border-[var(--theme-border)]/30',
    AVANT_GARDE: 'bg-black/90 border-[var(--theme-accent)]/30',
    MINIMALIST: 'bg-white/90 border-[var(--theme-border)]',
  });

  const btnBase = vc(vibe, {
    CLASSIC:
      'text-[var(--theme-accent-text)]/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10',
    AVANT_GARDE:
      'text-[var(--theme-accent)] hover:text-black hover:bg-[var(--theme-accent)] border border-[var(--theme-accent)]/40 font-space-mono text-xs',
    MINIMALIST:
      'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200',
  });

  const gymBtn = vc(vibe, {
    CLASSIC: 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)] hover:opacity-90',
    AVANT_GARDE: 'bg-[var(--theme-accent)] text-black hover:opacity-90 font-space-mono text-xs',
    MINIMALIST: 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)] hover:opacity-90',
  });

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl ${barBg}`}
      >
        <button
          onClick={onReExtract}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${btnBase}`}
          title="Re-generate with different settings"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Re-Extract</span>
        </button>
        <button
          onClick={onSimplify}
          disabled={isSimplifying}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${btnBase} disabled:opacity-40`}
          title="Simplify reading level"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isSimplifying ? 'Simplifying...' : 'Simplify'}</span>
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={onOpenChat}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${btnBase}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chat</span>
        </button>
        <button
          onClick={onEnterGym}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${gymBtn}`}
        >
          <Dumbbell className="w-4 h-4" />
          Enter the Gym
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Masterpiece View ─────────────────────────────────────────────────────

export default function MasterpieceView({
  content,
  vibe,
  persona,
  onEnterGym,
  onOpenChat,
  onReExtract,
  onSimplify,
  isSimplifying,
  pageImages = [],
  colorOverrides,
  onColorChange,
}: MasterpieceViewProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const [focusedColorKey, setFocusedColorKey] = useState<string | null>(null);
  const [hoveredColorKey, setHoveredColorKey] = useState<string | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Inject a <style> tag to apply color overrides scoped to .masterpiece-root
  // This avoids fighting React's style prop and works with the CSS cascade
  useEffect(() => {
    const styleId = 'masterpiece-color-overrides';
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    const vars = Object.entries(colorOverrides)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    const overrides = vars ? `.masterpiece-root { ${vars} }` : '';
    el.textContent = `.masterpiece-root [data-color-key] { cursor: pointer; } ${overrides}`;

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [colorOverrides]);

  // Click handler — lock focus on the nearest data-color-key element
  const handleColorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-color-key]') as HTMLElement | null;
    const key = el?.dataset?.colorKey ?? null;
    setFocusedColorKey(key);
  };

  // Hover handler — highlight the matching swatch as cursor moves around
  const handleColorHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-color-key]') as HTMLElement | null;
    setHoveredColorKey(el?.dataset?.colorKey ?? null);
  };

  const handleColorHoverLeave = () => setHoveredColorKey(null);

  const sections = Array.isArray(content.sections) ? content.sections : [];
  const pullQuotes = Array.isArray(content.pullQuotes) ? content.pullQuotes : [];
  const keyInsights = Array.isArray(content.keyInsights) ? content.keyInsights : [];

  const titleStyle = vc(vibe, {
    CLASSIC: 'font-playfair font-black text-4xl md:text-6xl leading-tight text-[var(--theme-title)]',
    AVANT_GARDE:
      'font-space-mono font-bold text-2xl md:text-4xl uppercase tracking-[0.1em] text-[var(--theme-accent)]',
    MINIMALIST:
      'font-inter font-light text-4xl md:text-6xl tracking-tight text-[var(--theme-title)]',
  });

  const bylineStyle = vc(vibe, {
    CLASSIC: 'font-playfair italic text-[var(--theme-text-muted)]',
    AVANT_GARDE: 'font-space-mono text-xs tracking-widest text-[var(--theme-accent)]/70',
    MINIMALIST: 'font-inter font-light text-[var(--theme-text-muted)] text-sm',
  });

  const dividerStyle = vc(vibe, {
    CLASSIC: 'border-t-2 border-[var(--theme-accent)]',
    AVANT_GARDE: 'border-t border-[var(--theme-accent)]/40',
    MINIMALIST: 'border-t border-[var(--theme-border)]',
  });

  const vibeLabel = vc(vibe, {
    CLASSIC: 'font-playfair italic',
    AVANT_GARDE: 'font-space-mono uppercase text-xs tracking-[0.2em]',
    MINIMALIST: 'font-inter text-xs tracking-widest',
  });

  return (
    <div
      ref={topRef}
      className="masterpiece-root min-h-screen pb-32"
      onClick={handleColorClick}
      onMouseOver={handleColorHover}
      onMouseLeave={handleColorHoverLeave}
      data-color-key="--theme-bg"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'var(--theme-font-body)',
      }}
    >
      {/* Avant-Garde scan line overlay */}
      {vibe === 'AVANT_GARDE' && <div className="fixed inset-0 scanlines pointer-events-none z-0" />}

      {/* ── Sticky header + color bar (both travel together) ── */}
      <div className="sticky top-0 z-40">
        {/* Magazine header row */}
        <div
          className={`backdrop-blur-md border-b ${vc(vibe, {
            CLASSIC: 'bg-[var(--theme-surface)]/90 border-[var(--theme-border)]',
            AVANT_GARDE: 'bg-black/90 border-[var(--theme-accent)]/30',
            MINIMALIST: 'bg-white/90 border-[var(--theme-border)]',
          })}`}
          data-color-key="--theme-surface"
        >
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className={`text-xs ${bylineStyle}`} data-color-key="--theme-text-muted">
              {vibe === 'AVANT_GARDE' ? '>> ' : ''}The Intelligent Reader
            </span>
            <span className={`text-xs ${bylineStyle}`} data-color-key="--theme-text-muted">
              🎭 {persona.length > 35 ? persona.slice(0, 32) + '…' : persona}
            </span>
          </div>
        </div>

        {/* Kindle-style color control bar */}
        <ColorControlBar
          colorOverrides={colorOverrides}
          onColorChange={onColorChange}
          focusedKey={focusedColorKey}
          hoveredKey={hoveredColorKey}
          vibe={vibe}
        />
      </div>

      {/* ── Page content — extra top padding for the two-row sticky header ── */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <span
            className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${vc(vibe, {
              CLASSIC: 'border-[var(--theme-accent)] text-[var(--theme-accent)] font-playfair italic',
              AVANT_GARDE:
                'border-[var(--theme-accent)] text-[var(--theme-accent)] font-space-mono uppercase tracking-widest',
              MINIMALIST: 'border-[var(--theme-border)] text-[var(--theme-text-muted)] font-inter',
            })}`}
            data-color-key="--theme-accent"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${vc(vibe, {
                CLASSIC: 'bg-[var(--theme-accent)]',
                AVANT_GARDE: 'bg-[var(--theme-accent)]',
                MINIMALIST: 'bg-gray-400',
              })}`}
            />
            {vibe === 'CLASSIC' ? 'Editorial Masterpiece' : vibe === 'AVANT_GARDE' ? '// DECODED //' : 'Intelligence Brief'}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mb-8 ${titleStyle}`}
          data-color-key={vibe === 'AVANT_GARDE' ? '--theme-accent' : '--theme-title'}
        >
          {content.title}
        </motion.h1>

        {/* Divider + Byline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`mb-10 pb-6 ${dividerStyle} border-b`}
          data-color-key="--theme-border"
        >
          <p className={`mt-4 text-sm ${bylineStyle}`} data-color-key="--theme-text-muted">
            {vibe === 'AVANT_GARDE' ? '>> PERSONA: ' : 'Narrated by '}
            <strong>{persona.length > 50 ? persona.slice(0, 47) + '…' : persona}</strong>
            {' · '}
            <span className={vibeLabel}>{vibe.replace('_', '-')}</span>
            {' · '}
            {sections.length} sections · {pullQuotes.length} pull quotes
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {/* Main content */}
          <div className="md:col-span-2">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <Section
                  section={section}
                  vibe={vibe}
                  sectionIndex={sectionIdx}
                  pageImages={pageImages}
                />
                {sectionIdx % 2 === 1 && pullQuotes[Math.floor(sectionIdx / 2)] && (
                  <PullQuote
                    quote={pullQuotes[Math.floor(sectionIdx / 2)]}
                    vibe={vibe}
                  />
                )}
              </div>
            ))}

            {pullQuotes.length > Math.floor(sections.length / 2) && (
              <PullQuote quote={pullQuotes[pullQuotes.length - 1]} vibe={vibe} />
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              <KeyInsights insights={keyInsights} vibe={vibe} />

              {/* Persona card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                data-color-key="--theme-surface"
                className={`rounded-2xl p-5 ${vc(vibe, {
                  CLASSIC: 'bg-[var(--theme-surface)] border border-[var(--theme-border)]',
                  AVANT_GARDE: 'bg-[var(--theme-surface)] border border-[var(--theme-accent)]/30',
                  MINIMALIST: 'bg-[var(--theme-surface)] border border-[var(--theme-border)]',
                })}`}
              >
                <p className={`text-xs uppercase tracking-widest mb-3 ${vc(vibe, {
                  CLASSIC: 'font-playfair italic text-[var(--theme-accent)]',
                  AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)]',
                  MINIMALIST: 'font-inter text-[var(--theme-text-muted)]',
                })}`}
                data-color-key="--theme-accent"
                >
                  Voice
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎭</span>
                  <p className={`font-semibold text-sm leading-snug ${vc(vibe, {
                    CLASSIC: 'font-playfair text-[var(--theme-text)]',
                    AVANT_GARDE: 'font-space-mono text-[var(--theme-accent)] uppercase text-xs',
                    MINIMALIST: 'font-inter text-[var(--theme-text)]',
                  })}`}
                  data-color-key="--theme-text"
                  >
                    {persona}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar
        vibe={vibe}
        onOpenChat={onOpenChat}
        onEnterGym={onEnterGym}
        onReExtract={onReExtract}
        onSimplify={onSimplify}
        isSimplifying={isSimplifying}
      />
    </div>
  );
}
