import React from "react";
import {
  connectNWC,
  disconnect,
  init,
  launchModal,
  onConnected,
  onConnecting,
  onDisconnected,
} from "@getalby/bitcoin-connect-react";
import { getFiatValue } from "@getalby/lightning-tools";
import type { WebLNProvider } from "@webbtc/webln-types";
import PullToRefresh from "pulltorefreshjs";
import type { SwapStatus } from "@lendasat/lendaswap-sdk-pure";
import { AppShell } from "./components/AppShell";
import { ConnectWalletForm } from "./components/ConnectWalletForm";
import { SetupForm } from "./components/SetupForm";
import {
  clearCardConfig,
  loadCardConfig,
  saveCardConfig,
  type CardConfig,
} from "./config";
import { readHashBootstrap } from "./hashBootstrap";
import {
  claimSwap,
  createTopupSwap,
  subscribeToSwap,
  SUPPORTED_CHAINS,
} from "./lendaswap";

const PRESET_AMOUNTS = [10, 25, 100];
const MIN_AMOUNT_USD = 2;

init({
  appName: "Bitcoin Card Topup",
});

// Read once at module-load, before any analytics/logging could grab
// document.URL. Strips the hash immediately — see hashBootstrap.ts.
const initialBootstrap = readHashBootstrap();

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function chainName(chainId: number): string {
  return (
    SUPPORTED_CHAINS.find((c) => c.chainId === chainId)?.name ??
    `Chain ${chainId}`
  );
}

// Terminal statuses where we should stop subscribing and decide success/refund.
const SUCCESS_STATUSES: SwapStatus[] = ["clientredeemed", "serverredeemed"];
const FAILURE_STATUSES: SwapStatus[] = [
  "expired",
  "clientrefunded",
  "clientrefundedserverrefunded",
  "clientrefundedserverfunded",
  "clientinvalidfunded",
  "clientfundedtoolate",
  "serverwontfund",
];

function statusLabel(status: SwapStatus | undefined): string {
  switch (status) {
    case undefined:
      return "Preparing swap…";
    case "pending":
      return "Waiting for Lightning payment…";
    case "clientfundingseen":
      return "Lightning payment seen…";
    case "clientfunded":
      return "Lightning payment received, funding card…";
    case "serverfunded":
      return "Claiming on-chain…";
    case "clientredeeming":
      return "Claiming on-chain…";
    case "clientredeemed":
    case "serverredeemed":
      return "Done!";
    default:
      return status;
  }
}

function App() {
  const [config, setConfig] = React.useState<CardConfig | null>(
    () => initialBootstrap.config ?? loadCardConfig(),
  );
  const [editing, setEditing] = React.useState(false);
  const [provider, setProvider] = React.useState<WebLNProvider>();
  const [isLoadingWallet, setLoadingWallet] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState<number>();
  const [walletUsdValue, setWalletUsdValue] = React.useState<number>();
  const [walletUsdError, setWalletUsdError] = React.useState(false);

  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(
    10,
  );
  const [isTopping, setTopping] = React.useState(false);
  const [swapStatus, setSwapStatus] = React.useState<SwapStatus | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  const connectTimeoutRef = React.useRef<number | undefined>(undefined);

  // Safety net: if the relay is unreachable or the URI is stale, bitcoin-connect
  // dispatches onConnecting but never onConnected/onDisconnected, leaving the UI
  // stuck on "Loading…". Reset the loading flag after a generous timeout so the
  // user can retry.
  const connectWithNwc = React.useCallback((nwcUri: string) => {
    // Wrapped — never surface the URI in error traces.
    try {
      connectNWC(nwcUri);
    } catch {
      /* swallow — never log the URI */
    }
    if (connectTimeoutRef.current !== undefined) {
      window.clearTimeout(connectTimeoutRef.current);
    }
    connectTimeoutRef.current = window.setTimeout(() => {
      connectTimeoutRef.current = undefined;
      setLoadingWallet((current) => {
        if (current) {
          setError(
            "Couldn't reach your wallet. Check the connection and try again.",
          );
        }
        return false;
      });
    }, 15_000);
  }, []);

  // Bootstrap from the URL hash if Alby Hub sent us here with a one-tap link.
  // Persist the card config so future visits don't need the link, and connect
  // the NWC wallet directly (skipping the bitcoin-connect modal).
  React.useEffect(() => {
    if (initialBootstrap.config) {
      saveCardConfig(initialBootstrap.config);
    }
    if (initialBootstrap.nwcUri) {
      connectWithNwc(initialBootstrap.nwcUri);
    }
    return () => {
      if (connectTimeoutRef.current !== undefined) {
        window.clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = undefined;
      }
    };
  }, [connectWithNwc]);

  React.useEffect(() => {
    const unsubConnected = onConnected(async (p) => {
      setProvider(p);
      setLoadingWallet(false);
      try {
        const balance = await p.getBalance?.();
        if (balance) setWalletBalance(balance.balance);
      } catch {
        // ignore — wallet might not support getBalance
      }
    });
    const unsubConnecting = onConnecting(() => setLoadingWallet(true));
    const unsubDisconnected = onDisconnected(() => {
      setProvider(undefined);
      setLoadingWallet(false);
      setWalletBalance(undefined);
      setWalletUsdValue(undefined);
      setWalletUsdError(false);
    });
    return () => {
      unsubConnected();
      unsubConnecting();
      unsubDisconnected();
    };
  }, []);

  React.useEffect(() => {
    if (walletBalance === undefined) return;
    setWalletUsdError(false);
    getFiatValue({ satoshi: walletBalance, currency: "USD" })
      .then(setWalletUsdValue)
      .catch(() => setWalletUsdError(true));
  }, [walletBalance]);

  React.useEffect(() => {
    PullToRefresh.init({
      mainElement: "body",
      onRefresh: () => window.location.reload(),
    });
  }, []);

  function handleSaveConfig(next: CardConfig) {
    saveCardConfig(next);
    setConfig(next);
    setEditing(false);
  }

  function handleForgetCard() {
    if (!confirm("Forget this card? You'll need to re-enter its details.")) {
      return;
    }
    clearCardConfig();
    setConfig(null);
    setSelectedAmount(null);
  }

  async function handleTopup() {
    if (!config || !provider || !selectedAmount) return;
    if (selectedAmount < MIN_AMOUNT_USD) {
      setError(`Minimum top up is $${MIN_AMOUNT_USD}.`);
      return;
    }

    setTopping(true);
    setError(null);
    setSuccessMessage(null);
    setSwapStatus(undefined);
    let unsubscribe: (() => void) | undefined;

    try {
      const swap = await createTopupSwap({
        chainId: config.chainId,
        currency: config.currency,
        amountUsd: selectedAmount,
        targetAddress: config.destinationAddress,
      });
      setSwapStatus(swap.status);

      const paymentPromise = provider.sendPayment(swap.bolt11_invoice);

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        let claimStarted = false;
        subscribeToSwap(swap.id, (_swapId, status) => {
          setSwapStatus(status);
          if (status === "serverfunded" && !claimStarted) {
            claimStarted = true;
            claimSwap(swap.id).catch((err) =>
              settle(() => reject(err instanceof Error ? err : new Error(String(err)))),
            );
          }
          if (SUCCESS_STATUSES.includes(status)) {
            settle(() => resolve());
          } else if (FAILURE_STATUSES.includes(status)) {
            settle(() => reject(new Error(`Swap ${status}`)));
          }
        }).then((unsub) => {
          unsubscribe = unsub;
        });

        paymentPromise.catch((err) =>
          settle(() => reject(err instanceof Error ? err : new Error(String(err)))),
        );
      });

      setSuccessMessage(
        `Sent $${selectedAmount} ${config.currency} to ${truncateAddress(
          config.destinationAddress,
        )}.`,
      );
      setSelectedAmount(10);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      unsubscribe?.();
      setTopping(false);
    }
  }

  const isWalletConnected = !!provider || isLoadingWallet;
  const isSetup = !config || editing;

  return (
    <AppShell
      isCardConfigured={!!config && !editing}
      isWalletConnected={isWalletConnected}
      onEditCard={() => setEditing(true)}
      onForgetCard={handleForgetCard}
      onDisconnectWallet={() => disconnect()}
    >
      {isSetup ? (
        <SetupForm
          initial={editing ? config : null}
          onSave={handleSaveConfig}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <div className="relative aspect-[1.586/1] w-full rounded-2xl bg-black text-white shadow-lg overflow-hidden">
            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                {config.label || "Card"}
              </h2>
              <div className="flex items-end justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                  <span className="badge badge-outline border-white/40 text-white">
                    {chainName(config.chainId)}
                  </span>
                  <span className="badge badge-outline border-white/40 text-white">
                    {config.currency}
                  </span>
                </div>
                <p className="font-mono text-sm text-white/80">
                  {truncateAddress(config.destinationAddress)}
                </p>
              </div>
            </div>
          </div>

          {(walletBalance !== undefined || isLoadingWallet || provider) && (
            <div className="px-1">
              <p className="text-sm font-medium text-base-content/60">
                Wallet Balance
              </p>
              {walletBalance === undefined ? (
                <p className="text-3xl font-bold">Loading…</p>
              ) : walletUsdError ? (
                <>
                  <p className="text-3xl font-bold text-error">
                    Failed to load USD rate
                  </p>
                  <p className="text-sm text-base-content/60">
                    {`${new Intl.NumberFormat().format(walletBalance)} sats`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    {walletUsdValue !== undefined
                      ? new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: "USD",
                        }).format(walletUsdValue)
                      : "Loading…"}
                  </p>
                  <p className="text-sm text-base-content/60">
                    {`${new Intl.NumberFormat().format(walletBalance)} sats`}
                  </p>
                </>
              )}
            </div>
          )}

          {!provider && !isLoadingWallet && (
            <ConnectWalletForm
              onSubmit={connectWithNwc}
              onOpenModal={() => launchModal()}
            />
          )}
          {isLoadingWallet && !provider && (
            <button className="btn btn-outline btn-lg w-full" disabled>
              <span className="loading loading-spinner"></span>
              Connecting…
            </button>
          )}

          {provider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Amount</p>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      className={`btn btn-lg ${
                        selectedAmount === amount
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                      onClick={() => setSelectedAmount(amount)}
                      disabled={isTopping}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button
                    className={`btn btn-lg ${
                      selectedAmount !== null &&
                      !PRESET_AMOUNTS.includes(selectedAmount)
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                    onClick={() => {
                      const input = prompt(
                        `Enter amount in USD (minimum $${MIN_AMOUNT_USD})`,
                      );
                      if (!input) return;
                      const value = parseFloat(input);
                      if (Number.isNaN(value) || value < MIN_AMOUNT_USD) {
                        alert(`Minimum top up amount is $${MIN_AMOUNT_USD}`);
                        return;
                      }
                      setSelectedAmount(value);
                    }}
                    disabled={isTopping}
                  >
                    {selectedAmount !== null &&
                    !PRESET_AMOUNTS.includes(selectedAmount)
                      ? `$${selectedAmount}`
                      : "Custom"}
                  </button>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                disabled={!selectedAmount || isTopping}
                onClick={handleTopup}
              >
                {isTopping ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    {statusLabel(swapStatus)}
                  </>
                ) : selectedAmount ? (
                  `Top up $${selectedAmount}`
                ) : (
                  "Select an amount"
                )}
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div role="alert" className="alert alert-success">
              <span>{successMessage}</span>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default App;
