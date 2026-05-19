import {
  Asset,
  Client,
  IdbSwapStorage,
  IdbWalletStorage,
  type LightningToEvmSwapResponse,
  type SwapStatusHandler,
} from "@lendasat/lendaswap-sdk-pure";

// CORS workaround: the LendaSwap API doesn't send CORS headers, so we route
// through a tiny pass-through proxy (see ./proxy). Override with
// VITE_LENDASWAP_API_URL when running the API locally.
const API_BASE_URL =
  import.meta.env.VITE_LENDASWAP_API_URL ||
  "https://lendaswap-proxy.fly.dev"; // "https://api.lendaswap.com"

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Client.builder()
      .withBaseUrl(API_BASE_URL)
      .withSignerStorage(new IdbWalletStorage())
      .withSwapStorage(new IdbSwapStorage())
      .build();
  }
  return clientPromise;
}

export type SupportedChain = {
  chainId: number;
  name: string;
};

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { chainId: 42161, name: "Arbitrum One" },
  { chainId: 137, name: "Polygon" },
  { chainId: 1, name: "Ethereum" },
];

export type SupportedCurrency = "USDC" | "USDT";
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["USDC", "USDT"];

// Decimals per token (smallest unit conversion).
const CURRENCY_DECIMALS: Record<SupportedCurrency, number> = {
  USDC: 6,
  USDT: 6,
};

export function toSmallestUnit(
  amountUsd: number,
  currency: SupportedCurrency,
): number {
  return Math.round(amountUsd * 10 ** CURRENCY_DECIMALS[currency]);
}

// Map (chainId, currency) → SDK Asset constant. Throws if combination not predefined.
export function getTargetAsset(chainId: number, currency: SupportedCurrency) {
  const key = `${currency}_${chainId}` as const;
  switch (key) {
    case "USDC_42161":
      return Asset.USDC_ARBITRUM;
    case "USDC_137":
      return Asset.USDC_POLYGON;
    case "USDC_1":
      return Asset.USDC_ETHEREUM;
    case "USDT_42161":
      return Asset.USDT_ARBITRUM;
    case "USDT_137":
      return Asset.USDT_POLYGON;
    case "USDT_1":
      return Asset.USDT_ETHEREUM;
    default:
      throw new Error(`Unsupported chain/currency combination: ${key}`);
  }
}

export async function createTopupSwap(params: {
  chainId: number;
  currency: SupportedCurrency;
  amountUsd: number;
  targetAddress: string;
}): Promise<LightningToEvmSwapResponse> {
  const client = await getClient();
  const targetAsset = getTargetAsset(params.chainId, params.currency);
  const targetAmount = toSmallestUnit(params.amountUsd, params.currency);

  const result = await client.createSwap({
    source: Asset.BTC_LIGHTNING,
    target: targetAsset,
    targetAmount,
    targetAddress: params.targetAddress,
    gasless: true,
  });
  // Source is BTC_LIGHTNING and target is an EVM token, so the SDK routes through
  // its Lightning→EVM path and returns a LightningToEvmSwapResponse.
  return result.response as LightningToEvmSwapResponse;
}

export async function subscribeToSwap(
  swapId: string,
  onUpdate: SwapStatusHandler,
): Promise<() => void> {
  const client = await getClient();
  return client.subscribeToSwaps([swapId], onUpdate);
}

export async function claimSwap(swapId: string) {
  const client = await getClient();
  return client.claim(swapId);
}
