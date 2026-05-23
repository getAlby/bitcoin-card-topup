import React from "react";
import { isAddress } from "viem";
import {
  SUPPORTED_CHAINS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "../lendaswap";
import type { CardConfig } from "../config";

interface Props {
  initial?: CardConfig | null;
  onSave: (config: CardConfig) => void;
  onCancel?: () => void;
}

export function SetupForm({ initial, onSave, onCancel }: Props) {
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [address, setAddress] = React.useState<string>(
    initial?.destinationAddress ?? "",
  );
  const [chainId, setChainId] = React.useState<number>(
    initial?.chainId ?? 42161,
  );
  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    initial?.currency ?? "USDC",
  );

  const addressValid = address === "" || isAddress(address);
  const canSave = address !== "" && addressValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    if (!confirm("Please double check the address, currency and network. Funds sent to the wrong address, currency or network will be lost.")) {
      return;
    }
    onSave({
      label: label.trim() || undefined,
      destinationAddress: address as `0x${string}`,
      chainId,
      currency,
    });
  }

  return (
    <form className="flex flex-col space-y-2" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold">
        {initial ? "Edit card" : "Set up your card"}
      </h2>
      <p className="text-sm opacity-80">
        Each topup will instantly swap bitcoin into your crypto debit card's deposit address.
      </p>

      <label className="form-control">
        <span className="label-text">Card label (optional)</span>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="RedotPay"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      <label className="form-control">
        <span className="label-text">Card deposit address</span>
        <input
          type="text"
          className={`input input-bordered w-full font-mono ${
            !addressValid ? "input-error" : ""
          }`}
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {!addressValid && (
          <p className="label-text-alt text-error mt-1 text-sm">
            Not a valid deposit address
          </p>
        )}
      </label>

      <label className="form-control">
        <span className="label-text">Currency</span>
        <select
          className="select select-bordered w-full"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label-text">Network</span>
        <select
          className="select select-bordered w-full"
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
        >
          {SUPPORTED_CHAINS.map((c) => (
            <option key={c.chainId} value={c.chainId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={!canSave}
        >
          Save card
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
