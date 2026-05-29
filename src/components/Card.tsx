import { SUPPORTED_CHAINS } from "../lendaswap";
import { PROVIDERS } from "../providers";
import type { CardConfig } from "../config";

// Fallback card name when the user didn't set a label: use the provider's
// display name, except for "other" which has no meaningful name → "Card".
function defaultLabel(config: CardConfig): string {
  if (config.provider === "other") return "Card";
  return PROVIDERS.find((p) => p.id === config.provider)?.name ?? "Card";
}

function chainName(chainId: number): string {
  return (
    SUPPORTED_CHAINS.find((c) => c.chainId === chainId)?.name ??
    `Chain ${chainId}`
  );
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Lightning addresses are human-readable (user@domain); only truncate very long ones.
function displayLightningAddress(addr: string): string {
  return addr.length > 28 ? `${addr.slice(0, 16)}…${addr.slice(-8)}` : addr;
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
  const displayLabel = config.label?.trim() || defaultLabel(config);

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
            <h2 className="text-xl font-semibold tracking-tight truncate">
              {displayLabel}
            </h2>
          </div>
          <ContactlessIcon />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-white/80 truncate">
              {config.fundingMethod === "lightning"
                ? displayLightningAddress(config.lightningAddress)
                : truncateAddress(config.destinationAddress)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {config.fundingMethod === "lightning" ? (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15 backdrop-blur-sm">
                Lightning
              </span>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15 backdrop-blur-sm">
                  {config.currency}
                </span>
                <span className="text-[11px] text-white/60">
                  {chainName(config.chainId)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
