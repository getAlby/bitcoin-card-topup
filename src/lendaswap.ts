import {
  Asset,
  Client,
  IdbSwapStorage,
  IdbWalletStorage,
  type GetSwapResponse,
  type LightningToEvmSwapResponse,
  type StoredSwap,
  type SwapStatus,
  type SwapStatusHandler,
} from "@satora/swap";

export type { StoredSwap, SwapStatus };

const API_BASE_URL = "https://api.satora.io";

// Account-abstraction config for the sponsored settlement UserOp used when
// claiming Arbitrum EVM DEX/CCTP swaps (same bundler / Gas Manager policy as
// app.satora.io).
// TODO: remove in next release
const AA_CONFIG = {
  bundlerUrl: "https://arb-mainnet.g.alchemy.com/v2/ZaG_75AoAHzPqzmys5jpD",
  paymasterPolicyId: "878b1c90-5b53-4c9c-8892-6d7659dd2e72",
};

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Client.builder()
      .withBaseUrl(API_BASE_URL)
      .withSignerStorage(new IdbWalletStorage())
      .withSwapStorage(new IdbSwapStorage())
      .withAa(AA_CONFIG)
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
    referralCode: "lnds_3bfe4d560abd5f50",
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

// Terminal statuses where we stop subscribing and decide success/refund.
export const SUCCESS_STATUSES: SwapStatus[] = [
  "clientredeemed",
  "serverredeemed",
];
export const FAILURE_STATUSES: SwapStatus[] = [
  "expired",
  "clientrefunded",
  "clientfundedserverrefunded",
  "clientrefundedserverrefunded",
  "clientrefundedserverfunded",
  "clientinvalidfunded",
  "clientfundedtoolate",
  "serverwontfund",
];

export function isSuccessStatus(status: SwapStatus): boolean {
  return SUCCESS_STATUSES.includes(status);
}

export function isTerminalStatus(status: SwapStatus): boolean {
  return SUCCESS_STATUSES.includes(status) || FAILURE_STATUSES.includes(status);
}

// Whether the Lightning payment has been registered by the swap. Before this,
// the swap is still `pending` and a payment failure is genuinely fatal; after
// it, a thrown payInvoice is the held-invoice client timeout and can be ignored.
export function paymentSeen(status: SwapStatus | undefined): boolean {
  return status !== undefined && status !== "pending";
}

export function statusLabel(status: SwapStatus | undefined): string {
  switch (status) {
    case undefined:
      return "Preparing swap…";
    case "pending":
      return "Waiting for Lightning payment…";
    case "clientfundingseen":
      return "Lightning payment seen…";
    case "clientfunded":
      return "Funding card…";
    case "serverfunded":
      return "Claiming on-chain…";
    case "clientredeeming":
      return "Claiming on-chain…";
    case "clientredeemed":
    case "serverredeemed":
      return "Done!";
    // Your funds came back to your wallet.
    case "clientrefunded":
    case "clientrefundedserverrefunded":
      return "Refunded";
    // The server unwound its side, but your Lightning payment is still held and
    // will be returned only when the held invoice expires (no client refund
    // exists for Lightning→EVM). Don't call this "Refunded" — funds aren't back.
    case "clientfundedserverrefunded":
      return "Failed — refund pending";
    default:
      return status;
  }
}

// All swaps persisted in IndexedDB, newest first.
export async function listSwaps(): Promise<StoredSwap[]> {
  const client = await getClient();
  const swaps = await client.listAllSwaps();
  return swaps.sort((a, b) => {
    const aTime = a.storedAt || Date.parse(a.response.created_at);
    const bTime = b.storedAt || Date.parse(b.response.created_at);
    return bTime - aTime;
  });
}

// Fetch the latest status from the server and persist it locally.
export async function refreshSwapStatus(id: string): Promise<GetSwapResponse> {
  const client = await getClient();
  return client.getSwap(id, { updateStorage: true });
}

// Drive a swap to completion: subscribe to status updates, auto-claim once the
// server funds the VHTLC, and resolve/reject on a terminal status.
//
// `payment` is the (held) Lightning invoice payment, if one is in flight. Its
// rejection is only fatal while the payment was never seen — once the swap has
// progressed past `pending`, a thrown payInvoice is the wallet's client-side
// timeout on the held invoice and is ignored so we keep monitoring to the end.
export async function runSwap(
  swapId: string,
  onStatus: (status: SwapStatus) => void,
  payment?: Promise<unknown>,
): Promise<void> {
  const client = await getClient();
  let latestStatus: SwapStatus | undefined;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    // Holder so the status callback can unsubscribe even if it fires
    // synchronously, before subscribeToSwaps returns the unsubscribe fn.
    const sub: { unsubscribe?: () => void } = {};
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      sub.unsubscribe?.();
      fn();
    };

    let claimStarted = false;
    sub.unsubscribe = client.subscribeToSwaps([swapId], (_id, status) => {
      latestStatus = status;
      onStatus(status);
      if (status === "serverfunded" && !claimStarted) {
        claimStarted = true;
        client
          .claim(swapId)
          .catch((err) =>
            settle(() =>
              reject(err instanceof Error ? err : new Error(String(err))),
            ),
          );
      }
      if (SUCCESS_STATUSES.includes(status)) {
        settle(() => resolve());
      } else if (FAILURE_STATUSES.includes(status)) {
        settle(() => reject(new Error(`Swap ${status}`)));
      }
    });

    payment?.catch((err) => {
      // Held-invoice client timeout once the swap is mid-flight — ignore and
      // keep waiting on the swap status. Only fatal if payment never registered.
      if (paymentSeen(latestStatus)) return;
      settle(() =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  });
}
