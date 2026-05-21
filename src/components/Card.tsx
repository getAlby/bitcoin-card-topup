import { SUPPORTED_CHAINS } from "../lendaswap";
import type { CardConfig } from "../config";

function chainName(chainId: number): string {
  return (
    SUPPORTED_CHAINS.find((c) => c.chainId === chainId)?.name ??
    `Chain ${chainId}`
  );
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Stylised contact-chip tile, the gold square on a real card.
function ChipIcon() {
  return (
    <svg viewBox="0 0 32 24" className="h-7 w-9" aria-hidden>
      <defs>
        <linearGradient id="chip-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8D88A" />
          <stop offset="50%" stopColor="#D4A857" />
          <stop offset="100%" stopColor="#8C6B2A" />
        </linearGradient>
      </defs>
      <rect width="32" height="24" rx="4" fill="url(#chip-gradient)" />
      <path
        d="M0 8h11M0 16h11M21 8h11M21 16h11M11 0v8M21 0v8M11 16v8M21 16v8"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
        fill="none"
      />
      <rect
        x="11"
        y="8"
        width="10"
        height="8"
        rx="1"
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
    </svg>
  );
}

// Three concentric arcs, the universal contactless-payment glyph.
function ContactlessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 6c2.5 2 2.5 10 0 12" />
      <path d="M12 4c4 3 4 13 0 16" />
      <path d="M16 2c5.5 4 5.5 16 0 20" />
    </svg>
  );
}

interface CardProps {
  config: CardConfig;
}

export function Card({ config }: CardProps) {
  const displayLabel = config.label?.trim() || "Crypto Card";

  return (
    <div
      className="relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl text-white shadow-lg"
      style={{
        // Deep slate base with a soft top-left highlight + diagonal sheen.
        // Inline so the radial highlight blends with the linear gradient
        // without needing a stacked Tailwind chain.
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%), linear-gradient(135deg, #1f2937 0%, #0f172a 55%, #020617 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)",
        }}
      />

      <div className="relative h-full p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Crypto Card
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight truncate">
              {displayLabel}
            </h2>
          </div>
          <ContactlessIcon />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <ChipIcon />
            <p className="font-mono text-xs text-white/80">
              {truncateAddress(config.destinationAddress)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15 backdrop-blur-sm">
              {config.currency}
            </span>
            <span className="text-[11px] text-white/60">
              {chainName(config.chainId)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
