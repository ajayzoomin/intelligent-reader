/**
 * Reforge — custom brand mark
 *
 * A shield-shaped forge vessel with three ascending flame/spark strokes
 * rising from an anvil baseline. The center flame is tallest (crown pattern).
 * Indigo-to-violet gradient body with warm amber flame highlights.
 *
 * Renders as a single self-contained SVG — safe to use multiple times on
 * the same page because AnimatePresence ensures only one phase is mounted
 * at a time, so gradient IDs never collide.
 */
export default function ReforgeLogoIcon({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Shield body — indigo → deep violet */}
        <linearGradient id="rfl-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="60%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>

        {/* Inner bevel highlight — gives the shield depth */}
        <linearGradient id="rfl-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Flame strokes — amber warmth rising from cool base */}
        <linearGradient id="rfl-flame" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* ── Shield body ──────────────────────────────────────── */}
      {/* Pentagon with a pointed bottom — the forge crucible */}
      <path
        d="M12 1 L22 6.5 L22 17 L12 26 L2 17 L2 6.5 Z"
        fill="url(#rfl-body)"
      />

      {/* ── Inner bevel — top-left face catch ─────────────────── */}
      <path
        d="M12 1 L22 6.5 L22 17 L12 26 L2 17 L2 6.5 Z"
        fill="url(#rfl-bevel)"
        opacity="0.6"
      />

      {/* ── Thin edge highlight — left facet ─────────────────── */}
      <path
        d="M12 1.5 L2.5 6.8 L2.5 17"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Forge bed / anvil baseline ────────────────────────── */}
      <line
        x1="6.5"
        y1="18.5"
        x2="17.5"
        y2="18.5"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* ── Three ascending flame strokes ─────────────────────── */}
      {/* Left flame */}
      <line
        x1="8.5"
        y1="18.5"
        x2="8.5"
        y2="13.5"
        stroke="url(#rfl-flame)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Center flame — tallest, most intense */}
      <line
        x1="12"
        y1="18.5"
        x2="12"
        y2="8.5"
        stroke="url(#rfl-flame)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Right flame */}
      <line
        x1="15.5"
        y1="18.5"
        x2="15.5"
        y2="13.5"
        stroke="url(#rfl-flame)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* ── Apex spark — the hottest point ───────────────────── */}
      <circle cx="12" cy="8" r="1.2" fill="#fef3c7" opacity="0.9" />
    </svg>
  );
}
