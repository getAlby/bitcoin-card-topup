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
import type { SwapStatus } from "@satora/swap";
import { AppShell } from "./components/AppShell";
import { Card } from "./components/Card";
import { ConnectWalletForm } from "./components/ConnectWalletForm";
import { SetupForm } from "./components/SetupForm";
import { Welcome } from "./components/Welcome";
import {
  clearCardConfig,
  loadCardConfig,
  saveCardConfig,
  type CardConfig,
} from "./config";
import { providerMinAmount, readProviderParam } from "./providers";
import { createTopupSwap, runSwap, statusLabel } from "./lendaswap";
import { payInvoice } from "./pay";
import { createLightningTopupInvoice } from "./lightningTopup";

const PreviousSwaps = React.lazy(() => import("./components/PreviousSwaps"));

const PRESET_AMOUNTS = [10, 25, 100];
const MIN_AMOUNT_USD = 2;

// Pick a sensible default selected amount that respects the provider minimum:
// the lowest preset at or above the minimum, falling back to the minimum itself.
function defaultAmount(minAmount: number): number {
  return PRESET_AMOUNTS.find((a) => a >= minAmount) ?? minAmount;
}

init({
  appName: "Bitcoin Card Topup",
});

// Optional ?provider= query param used to pre-select the provider in the setup
// form (only relevant when no card is configured yet). Read non-destructively —
// the URL is never modified.
const initialProvider = readProviderParam();

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function App() {
  const [config, setConfig] = React.useState<CardConfig | null>(() =>
    loadCardConfig(),
  );
  const [editing, setEditing] = React.useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);
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
  // Progress label for the swap-free Lightning-address path.
  const [lightningStatus, setLightningStatus] = React.useState<
    string | undefined
  >();
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [showSwaps, setShowSwaps] = React.useState(false);

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

  // Clear any pending connect timeout when the component unmounts.
  React.useEffect(() => {
    return () => {
      if (connectTimeoutRef.current !== undefined) {
        window.clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = undefined;
      }
    };
  }, []);

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

  // Minimum top-up amount for the current card's provider.
  const minAmount = config ? providerMinAmount(config.provider) : MIN_AMOUNT_USD;

  // Bump the selected amount up to the minimum when it would otherwise be below
  // it (e.g. after switching to a provider with a higher minimum like Freedomia).
  React.useEffect(() => {
    setSelectedAmount((current) =>
      current !== null && current < minAmount ? defaultAmount(minAmount) : current,
    );
  }, [minAmount]);

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
    if (selectedAmount < minAmount) {
      setError(`Minimum top up is $${minAmount}.`);
      return;
    }

    setTopping(true);
    setError(null);
    setSuccessMessage(null);
    setSwapStatus(undefined);
    setLightningStatus(undefined);

    try {
      if (config.fundingMethod === "lightning") {
        setLightningStatus("Requesting invoice…");
        const bolt11 = await createLightningTopupInvoice({
          lightningAddress: config.lightningAddress,
          amountUsd: selectedAmount,
        });
        setLightningStatus("Waiting for Lightning payment…");
        await payInvoice(provider, bolt11, {
          comment: `Bitcoin card top-up ($${selectedAmount})`,
          recipient_data: { identifier: config.lightningAddress },
        });
        setSuccessMessage(
          `Sent $${selectedAmount} to ${config.lightningAddress}.`,
        );
        setSelectedAmount(defaultAmount(minAmount));
        return;
      }

      const swap = await createTopupSwap({
        chainId: config.chainId,
        currency: config.currency,
        amountUsd: selectedAmount,
        targetAddress: config.destinationAddress,
      });
      setSwapStatus(swap.status);

      // The invoice is held until the swap completes, so payInvoice may throw on
      // a client-side timeout while the swap is still progressing. runSwap only
      // treats that as fatal if the payment was never seen — otherwise it keeps
      // monitoring the swap to completion.
      const paymentPromise = payInvoice(provider, swap.bolt11_invoice, {
        comment: `Bitcoin card top-up ($${selectedAmount} ${config.currency})`,
        recipient_data: { identifier: config.destinationAddress },
      });

      await runSwap(swap.id, setSwapStatus, paymentPromise);

      setSuccessMessage(
        `Sent $${selectedAmount} ${config.currency} to ${truncateAddress(
          config.destinationAddress,
        )}.`,
      );
      setSelectedAmount(defaultAmount(minAmount));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setTopping(false);
    }
  }

  const isWalletConnected = !!provider || isLoadingWallet;
  const showWelcome = !config && !editing && !welcomeDismissed;
  const isSetup = !config || editing;

  return (
    <AppShell
      isCardConfigured={!!config && !editing}
      isWalletConnected={isWalletConnected}
      // Only for a configured swap-funded card: the Lightning-address flow
      // doesn't use lendaswap, and there's nothing to show before a card is set.
      // `!== "lightning"` (rather than `=== "swap"`) also covers legacy configs,
      // which predate the fundingMethod field and represent swap-funded cards.
      showPreviousSwaps={!!config && !editing && config.fundingMethod !== "lightning"}
      onEditCard={() => setEditing(true)}
      onForgetCard={handleForgetCard}
      onDisconnectWallet={() => {
        if (!confirm("Disconnect your bitcoin lightning wallet?")) return;
        disconnect();
      }}
      onViewSwaps={() => setShowSwaps(true)}
    >
      {showSwaps && (
        <React.Suspense fallback={null}>
          <PreviousSwaps
            provider={provider}
            onClose={() => setShowSwaps(false)}
          />
        </React.Suspense>
      )}
      {showWelcome ? (
        <Welcome onGetStarted={() => setWelcomeDismissed(true)} />
      ) : isSetup ? (
        <SetupForm
          initial={editing ? config : null}
          initialProvider={initialProvider}
          onSave={handleSaveConfig}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <Card config={config} />

          {(walletBalance !== undefined || isLoadingWallet || provider) && (
            <div className="flex items-baseline justify-between px-1 text-sm">
              <span className="text-base-content/60">Wallet balance</span>
              <span className="font-medium">
                {walletBalance === undefined
                  ? "Loading…"
                  : walletUsdError
                  ? `${new Intl.NumberFormat().format(walletBalance)} sats`
                  : walletUsdValue !== undefined
                  ? `${new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "USD",
                    }).format(walletUsdValue)} · ${new Intl.NumberFormat().format(
                      walletBalance,
                    )} sats`
                  : `${new Intl.NumberFormat().format(walletBalance)} sats`}
              </span>
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
                <p className="text-sm font-medium">
                  Minimum topup amount: ${minAmount}
                </p>
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
                      disabled={isTopping || amount < minAmount}
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
                        `Enter amount in USD (minimum $${minAmount})`,
                      );
                      if (!input) return;
                      const value = parseFloat(input);
                      if (Number.isNaN(value) || value < minAmount) {
                        alert(`Minimum top up amount is $${minAmount}`);
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
                disabled={
                  !selectedAmount || selectedAmount < minAmount || isTopping
                }
                onClick={handleTopup}
              >
                {isTopping ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    {config.fundingMethod === "lightning"
                      ? lightningStatus ?? "Topping up…"
                      : statusLabel(swapStatus)}
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
