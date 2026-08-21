import React from "react";
import type { WebLNProvider } from "@webbtc/webln-types";
import type { LightningToEvmSwapResponse } from "@satora/swap";
import {
  isSuccessStatus,
  isTerminalStatus,
  listSwaps,
  paymentSeen,
  refreshSwapStatus,
  runSwap,
  statusLabel,
  type StoredSwap,
  type SwapStatus,
} from "../lendaswap";
import { payInvoice } from "../pay";

interface Props {
  provider?: WebLNProvider;
  onClose: () => void;
}

interface RowState {
  status?: SwapStatus;
  busy?: boolean;
  // Re-checking the live status with the server (stored status can be stale —
  // the SDK doesn't persist status updates received over the websocket).
  checking?: boolean;
  error?: string;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Only Lightning→EVM swaps are created by this app; narrow to that shape so we
// can read the invoice/amount/address fields. Other swap types are skipped.
function lightningEvmResponse(
  swap: StoredSwap,
): LightningToEvmSwapResponse | null {
  return swap.response.direction === "lightning_to_evm"
    ? swap.response
    : null;
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function PreviousSwaps({ provider, onClose }: Props) {
  const [swaps, setSwaps] = React.useState<StoredSwap[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Record<string, RowState>>({});

  const updateRow = React.useCallback((id: string, patch: RowState) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    listSwaps()
      .then((all) => {
        if (cancelled) return;
        const lne = all.filter((s) => lightningEvmResponse(s) !== null);
        setSwaps(lne);
        // The SDK doesn't persist websocket status updates, so a completed swap
        // can still be stored as e.g. "serverfunded". Re-check any non-terminal
        // swap against the server (this also re-persists the latest status).
        for (const swap of lne) {
          const status = lightningEvmResponse(swap)!.status;
          if (isTerminalStatus(status)) continue;
          updateRow(swap.swapId, { checking: true });
          refreshSwapStatus(swap.swapId)
            .then((latest) => {
              if (cancelled) return;
              updateRow(swap.swapId, { status: latest.status, checking: false });
            })
            .catch(() => {
              if (cancelled) return;
              updateRow(swap.swapId, { checking: false });
            });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [updateRow]);

  async function handleContinue(swap: StoredSwap, response: LightningToEvmSwapResponse) {
    const id = swap.swapId;
    updateRow(id, { busy: true, error: undefined });
    try {
      // Re-fetch the latest status from the server before deciding what to do.
      const latest = await refreshSwapStatus(id);
      updateRow(id, { status: latest.status });
      if (isTerminalStatus(latest.status)) {
        updateRow(id, {
          busy: false,
          error: isSuccessStatus(latest.status)
            ? undefined
            : `Swap ${latest.status}`,
        });
        return;
      }

      // If the payment was never seen the swap is still waiting to be funded —
      // (re-)pay the held invoice. Needs the wallet connected.
      let paymentPromise: Promise<void> | undefined;
      if (!paymentSeen(latest.status)) {
        if (!provider) {
          updateRow(id, {
            busy: false,
            error: "Connect your wallet to continue.",
          });
          return;
        }
        const address = swap.targetAddress ?? response.target_evm_address;
        paymentPromise = payInvoice(provider, response.bolt11_invoice, {
          comment: `Bitcoin card top-up (${response.target_token.symbol})`,
          ...(address ? { recipient_data: { identifier: address } } : {}),
        });
      }

      await runSwap(id, (s) => updateRow(id, { status: s }), paymentPromise);
      updateRow(id, { busy: false });
    } catch (e) {
      updateRow(id, {
        busy: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-3">Previous swaps</h3>

        {loadError ? (
          <div role="alert" className="alert alert-error">
            <span>{loadError}</span>
          </div>
        ) : swaps === null ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner"></span>
          </div>
        ) : swaps.length === 0 ? (
          <p className="text-base-content/60 py-4 text-sm">No swaps yet.</p>
        ) : (
          <ul className="space-y-3">
            {swaps.map((swap) => {
              const response = lightningEvmResponse(swap);
              if (!response) return null;
              const row = rows[swap.swapId];
              const status = row?.status ?? response.status;
              const amount =
                Number(response.target_amount) /
                10 ** response.target_token.decimals;
              const address =
                swap.targetAddress ?? response.target_evm_address ?? "";
              // Don't offer Continue until we've confirmed the live status —
              // the stored one may be stale and already complete.
              const continuable = !row?.checking && !isTerminalStatus(status);

              return (
                <li
                  key={swap.swapId}
                  className="rounded-box border border-base-300 p-3 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {new Intl.NumberFormat().format(amount)}{" "}
                      {response.target_token.symbol}
                    </span>
                    <span className="text-xs text-base-content/60">
                      {dateFmt.format(new Date(response.created_at))}
                    </span>
                  </div>
                  {address && (
                    <div className="text-xs text-base-content/60">
                      {truncateAddress(address)}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">
                      {row?.checking ? "Checking…" : statusLabel(status)}
                    </span>
                    {continuable && (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={row?.busy}
                        onClick={() => handleContinue(swap, response)}
                      >
                        {row?.busy && (
                          <span className="loading loading-spinner loading-xs"></span>
                        )}
                        Continue
                      </button>
                    )}
                  </div>
                  {row?.error && (
                    <div className="text-xs text-error">{row.error}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
