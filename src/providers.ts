import { LN_ADDRESS_REGEX } from "@getalby/lightning-tools/lnurl";
import type { SupportedCurrency } from "./lendaswap";

// A card provider. Drives the onboarding defaults (funding method + chain/currency).
export type Provider = "freedomia" | "redotpay" | "other";

export type FundingMethod = "swap" | "lightning";

// Options shown in the provider dropdown. RedotPay is first as the default.
export const PROVIDERS: { id: Provider; name: string }[] = [
  { id: "redotpay", name: "RedotPay" },
  { id: "freedomia", name: "Freedomia" },
  { id: "other", name: "Other" },
];

// Default provider selected in the setup form when none is supplied via the
// ?provider= query param or an existing config.
export const DEFAULT_PROVIDER: Provider = "redotpay";

export type ProviderDefault = {
  // The default/initial funding method when this provider is selected.
  fundingMethod: FundingMethod;
  // Whether the user may switch the funding method in the form.
  allowMethodToggle: boolean;
  // Minimum top-up amount in USD accepted by this provider.
  minAmountUsd: number;
  // Defaults applied to the swap path (used when funding method is "swap").
  chainId?: number;
  currency?: SupportedCurrency;
};

export const PROVIDER_DEFAULTS: Record<Provider, ProviderDefault> = {
  // Freedomia accepts Lightning directly via a Lightning address — no swap.
  freedomia: {
    fundingMethod: "lightning",
    allowMethodToggle: false,
    minAmountUsd: 25,
  },
  // RedotPay is funded by an on-chain stablecoin swap.
  redotpay: {
    fundingMethod: "swap",
    allowMethodToggle: false,
    minAmountUsd: 2,
    chainId: 42161,
    currency: "USDC",
  },
  // Other: defaults to Lightning, but the user may switch to Crypto/Stablecoins
  // (Arbitrum + USDC defaults apply if they do). We don't know the real minimum,
  // so $2 is a sensible default.
  other: {
    fundingMethod: "lightning",
    allowMethodToggle: true,
    minAmountUsd: 2,
    chainId: 42161,
    currency: "USDC",
  },
};

// The minimum top-up amount in USD for a provider.
export function providerMinAmount(provider: Provider): number {
  return PROVIDER_DEFAULTS[provider].minAmountUsd;
}

export function isProvider(value: unknown): value is Provider {
  return value === "freedomia" || value === "redotpay" || value === "other";
}

// Reads ?provider= from the URL search string (a normal query param, distinct
// from the hash bootstrap). Returns null if absent or unrecognized.
export function readProviderParam(): Provider | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("provider");
  return isProvider(value) ? value : null;
}

export function isValidLightningAddress(address: string): boolean {
  return LN_ADDRESS_REGEX.test(address.trim());
}
