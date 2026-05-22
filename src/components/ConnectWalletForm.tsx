import React from "react";

const QrScannerModal = React.lazy(() => import("./QrScannerModal"));

interface Props {
  onSubmit: (nwcUri: string) => void;
  onOpenModal: () => void;
}

const NWC_PREFIX = "nostr+walletconnect://";

export function ConnectWalletForm({ onSubmit, onOpenModal }: Props) {
  const [nwcUri, setNwcUri] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function tryConnect(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith(NWC_PREFIX)) {
      setError("Not a valid NWC connection string");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    tryConnect(nwcUri);
  }

  function handleScan(value: string) {
    setScanning(false);
    setNwcUri(value);
    tryConnect(value);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="form-control">
          <span className="label-text text-sm font-semibold">NWC connection secret</span>
          <div className="join w-full mt-1">
            <input
              type="password"
              className={`input input-bordered join-item flex-1 ${
                error ? "input-error" : ""
              }`}
              placeholder="nostr+walletconnect://…"
              value={nwcUri}
              onChange={(e) => {
                setNwcUri(e.target.value);
                setError(null);
              }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn join-item"
              onClick={() => {
                setError(null);
                setScanning(true);
              }}
              aria-label="Scan QR code"
            >
              <ScanIcon />
            </button>
          </div>
          {error && (
            <span className="label-text-alt text-error mt-1">{error}</span>
          )}
        </label>
        <button
          type="submit"
          className="btn btn-primary w-full mt-2"
          disabled={!nwcUri.trim()}
        >
          Connect wallet
        </button>
      </form>
      <button
        type="button"
        className="btn btn-ghost btn-sm w-full"
        onClick={onOpenModal}
      >
        View supported wallets
      </button>

      {scanning && (
        <React.Suspense fallback={null}>
          <QrScannerModal
            onScan={handleScan}
            onError={(message) => {
              setError(message);
              setScanning(false);
            }}
            onCancel={() => setScanning(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
