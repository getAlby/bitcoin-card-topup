interface HamburgerMenuProps {
  isCardConfigured: boolean;
  isWalletConnected: boolean;
  onEditCard: () => void;
  onForgetCard: () => void;
  onDisconnectWallet: () => void;
}

export function HamburgerMenu({
  isCardConfigured,
  isWalletConnected,
  onEditCard,
  onForgetCard,
  onDisconnectWallet,
}: HamburgerMenuProps) {
  const hasItems = isCardConfigured || isWalletConnected;
  if (!hasItems) return null;

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-square btn-ghost">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block w-5 h-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </div>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content mt-3 gap-2 z-10 p-2 shadow bg-base-100 rounded-box w-64"
      >
        {isCardConfigured && (
          <>
            <li>
              <button onClick={onEditCard} className="text-left">
                Edit card
              </button>
            </li>
            <li>
              <button onClick={onForgetCard} className="text-left">
                Forget card
              </button>
            </li>
          </>
        )}
        {isWalletConnected && (
          <li>
            <button onClick={onDisconnectWallet} className="text-left">
              Disconnect wallet
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
