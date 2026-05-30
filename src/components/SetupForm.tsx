import React from "react";
import { isAddress } from "viem";
import {
  SUPPORTED_CHAINS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "../lendaswap";
import {
  DEFAULT_PROVIDER,
  PROVIDER_DEFAULTS,
  PROVIDERS,
  isValidLightningAddress,
  type FundingMethod,
  type Provider,
} from "../providers";
import type { CardConfig } from "../config";

interface Props {
  initial?: CardConfig | null;
  initialProvider?: Provider | null;
  onSave: (config: CardConfig) => void;
  onCancel?: () => void;
}

export function SetupForm({ initial, initialProvider, onSave, onCancel }: Props) {
  const startProvider: Provider =
    initial?.provider ?? initialProvider ?? DEFAULT_PROVIDER;
  const startDefaults = PROVIDER_DEFAULTS[startProvider];

  const [provider, setProvider] = React.useState<Provider>(startProvider);
  const [fundingMethod, setFundingMethod] = React.useState<FundingMethod>(
    initial?.fundingMethod ?? startDefaults.fundingMethod,
  );
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [address, setAddress] = React.useState<string>(
    initial?.fundingMethod === "swap" ? initial.destinationAddress : "",
  );
  const [chainId, setChainId] = React.useState<number>(
    initial?.fundingMethod === "swap"
      ? initial.chainId
      : startDefaults.chainId ?? 42161,
  );
  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    initial?.fundingMethod === "swap"
      ? initial.currency
      : startDefaults.currency ?? "USDC",
  );
  const [lightningAddress, setLightningAddress] = React.useState<string>(
    initial?.fundingMethod === "lightning" ? initial.lightningAddress : "",
  );

  function handleProviderChange(next: Provider) {
    setProvider(next);
    const d = PROVIDER_DEFAULTS[next];
    setFundingMethod(d.fundingMethod);
    if (d.chainId !== undefined) setChainId(d.chainId);
    if (d.currency !== undefined) setCurrency(d.currency);
  }

  const allowMethodToggle = PROVIDER_DEFAULTS[provider].allowMethodToggle;
  const isLightning = fundingMethod === "lightning";

  const addressValid = address === "" || isAddress(address);
  const lnValid = lightningAddress === "" || isValidLightningAddress(lightningAddress);
  const canSave = isLightning
    ? lightningAddress !== "" && lnValid
    : address !== "" && addressValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    if (isLightning) {
      if (
        !confirm(
          "Please double check the Lightning address. Funds sent to the wrong address will be lost.",
        )
      ) {
        return;
      }
      onSave({
        provider,
        label: label.trim() || undefined,
        fundingMethod: "lightning",
        lightningAddress: lightningAddress.trim(),
      });
      return;
    }

    if (
      !confirm(
        "Please double check the address, currency and network. Funds sent to the wrong address, currency or network will be lost.",
      )
    ) {
      return;
    }
    onSave({
      provider,
      label: label.trim() || undefined,
      fundingMethod: "swap",
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
        {isLightning
          ? "Each topup instantly pays your card's Lightning address from your bitcoin lightning wallet."
          : "Each topup will instantly swap bitcoin into your crypto debit card's deposit address."}
      </p>

      <label className="form-control">
        <span className="label-text">Provider</span>
        <select
          className="select select-bordered w-full"
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as Provider)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {allowMethodToggle && (
        <label className="form-control">
          <span className="label-text">Funding method</span>
          <div className="join w-full">
            <button
              type="button"
              className={`btn join-item flex-1 ${
                isLightning ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFundingMethod("lightning")}
            >
              Lightning
            </button>
            <button
              type="button"
              className={`btn join-item flex-1 ${
                !isLightning ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFundingMethod("swap")}
            >
              Crypto/Stablecoins
            </button>
          </div>
        </label>
      )}

      <label className="form-control">
        <span className="label-text">Card label (optional)</span>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="e.g. Groceries, Travel, Subscriptions"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      {isLightning ? (
        <label className="form-control">
          <span className="label-text">Lightning address</span>
          <input
            type="text"
            className={`input input-bordered w-full ${
              !lnValid ? "input-error" : ""
            }`}
            placeholder="you@freedomia.me"
            value={lightningAddress}
            onChange={(e) => setLightningAddress(e.target.value.trim())}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {!lnValid && (
            <p className="label-text-alt text-error mt-1 text-sm">
              Not a valid Lightning address
            </p>
          )}
        </label>
      ) : (
        <>
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
        </>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={!canSave}
        >
          Save card
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
