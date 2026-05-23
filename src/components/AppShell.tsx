import React from "react";
import { HamburgerMenu } from "./HamburgerMenu";
import {
  loadInstallHintDismissed,
  saveInstallHintDismissed,
  useShouldShowInstallHint,
} from "../pwa";

interface AppShellProps {
  isCardConfigured: boolean;
  isWalletConnected: boolean;
  onEditCard: () => void;
  onForgetCard: () => void;
  onDisconnectWallet: () => void;
  children: React.ReactNode;
}

export function AppShell({
  isCardConfigured,
  isWalletConnected,
  onEditCard,
  onForgetCard,
  onDisconnectWallet,
  children,
}: AppShellProps) {
  const showInstallHint = useShouldShowInstallHint();
  const [installHintDismissed, setInstallHintDismissed] = React.useState(
    loadInstallHintDismissed,
  );

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-100">
        <div className="flex flex-1 flex-row flex-nowrap items-center px-2 gap-3">
          <img src="/shortcut-icon.png" alt="" className="w-8 h-8 rounded-lg" />
          <h1 className="text-xl font-bold">Bitcoin Card Topup</h1>
        </div>
        <div className="flex-none">
          <HamburgerMenu
            isCardConfigured={isCardConfigured}
            isWalletConnected={isWalletConnected}
            showInstallHint={showInstallHint}
            onEditCard={onEditCard}
            onForgetCard={onForgetCard}
            onDisconnectWallet={onDisconnectWallet}
          />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {showInstallHint && !installHintDismissed && (
            <div role="alert" className="alert alert-info">
              <span className="flex-1 text-sm">
                Add this app to your home screen for a more convenient
                experience.
              </span>
              <button
                aria-label="Dismiss"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => {
                  saveInstallHintDismissed();
                  setInstallHintDismissed(true);
                }}
              >
                ✕
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
