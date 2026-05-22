import { Scanner } from "@yudiel/react-qr-scanner";

interface Props {
  onScan: (value: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export default function QrScannerModal({ onScan, onError, onCancel }: Props) {
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-3">Scan NWC QR code</h3>
        <div className="overflow-hidden rounded-lg">
          <Scanner
            onScan={(results) => {
              const value = results[0]?.rawValue;
              if (value) onScan(value);
            }}
            onError={(err) => {
              onError(err instanceof Error ? err.message : String(err));
            }}
            formats={["qr_code"]}
          />
        </div>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
