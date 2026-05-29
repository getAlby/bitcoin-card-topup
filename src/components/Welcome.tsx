interface Props {
  onGetStarted: () => void;
}

export function Welcome({ onGetStarted }: Props) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <img
        src="/shortcut-icon.png"
        alt=""
        className="w-32 h-32 rounded-3xl shadow-lg"
      />
      <div className="space-y-2">
        <p>Welcome to</p>
        <h2 className="text-3xl font-bold tracking-tight">
          Bitcoin Card Topup
        </h2>
        <p className="text-base-content/70">
          Live on bitcoin - top up your virtual debit card in seconds from your bitcoin lightning wallet and make card payments online and in the real world with Apple and Google Pay.
        </p>
      </div>

      <div className="text-left space-y-4 w-full">
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="font-bold text-primary">1.</span>
            <p>Choose your card provider and enter its details.</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary">2.</span>
            <p>Connect your bitcoin lightning wallet.</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary">3.</span>
            <p>One-Tap topups - your card is funded in seconds.</p>
          </div>
        </div>
        <p className="text-sm text-base-content/70">
          Hold your savings in bitcoin and convert only what you need, when you
          need it. The easy way to live on bitcoin.
        </p>
      </div>

      <button
        className="btn btn-primary btn-lg w-full"
        onClick={onGetStarted}
      >
        Get started
      </button>
    </div>
  );
}
