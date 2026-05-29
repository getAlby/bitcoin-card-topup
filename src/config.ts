import { isAddress } from "viem";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "./lendaswap";
import { isProvider, isValidLightningAddress, type Provider } from "./providers";

const STORAGE_KEY = "crypto_card_config";

type BaseConfig = {
  provider: Provider;
  label?: string;
};

// Funded by an on-chain stablecoin swap (Lightning → EVM token).
export type SwapCardConfig = BaseConfig & {
  fundingMethod: "swap";
  destinationAddress: `0x${string}`;
  chainId: number;
  currency: SupportedCurrency;
};

// Funded by paying a Lightning address directly (no swap).
export type LightningCardConfig = BaseConfig & {
  fundingMethod: "lightning";
  lightningAddress: string;
};

export type CardConfig = SwapCardConfig | LightningCardConfig;

function parseConfig(parsed: Record<string, unknown>): CardConfig | null {
  const provider = isProvider(parsed.provider) ? parsed.provider : "other";
  const label = typeof parsed.label === "string" ? parsed.label : undefined;

  // Lightning variant.
  if (parsed.fundingMethod === "lightning") {
    if (
      typeof parsed.lightningAddress === "string" &&
      isValidLightningAddress(parsed.lightningAddress)
    ) {
      return {
        provider,
        label,
        fundingMethod: "lightning",
        lightningAddress: parsed.lightningAddress,
      };
    }
    return null;
  }

  // Swap variant — also the migration target for legacy configs that predate
  // the provider/fundingMethod fields (they only had address/chainId/currency).
  if (
    typeof parsed.destinationAddress === "string" &&
    isAddress(parsed.destinationAddress) &&
    typeof parsed.chainId === "number" &&
    typeof parsed.currency === "string" &&
    SUPPORTED_CURRENCIES.includes(parsed.currency as SupportedCurrency)
  ) {
    return {
      provider,
      label,
      fundingMethod: "swap",
      destinationAddress: parsed.destinationAddress as `0x${string}`,
      chainId: parsed.chainId,
      currency: parsed.currency as SupportedCurrency,
    };
  }

  return null;
}

export function loadCardConfig(): CardConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseConfig(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function saveCardConfig(config: CardConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearCardConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
