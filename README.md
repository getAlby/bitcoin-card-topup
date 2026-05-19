# Bitcoin Card Topup

**Instantly top up any crypto debit card with one tap via the Bitcoin Lightning Network**

> Experimental: Test only with small amounts.

A 1-click way to top up any on-chain crypto card with Lightning. Configure your card's deposit address once, connect an NWC wallet, and top up in one tap. Lightning sats are atomically swapped to USDC (or USDT) on Arbitrum, Polygon, or Ethereum via the [LendaSwap](https://lendaswap.com) API and delivered to your card's deposit address.

Save it as a PWA on your phone for fast access.

## How it works

1. One-time setup: enter your card's deposit address, network (default Arbitrum One), and currency (default USDC).
2. Connect a Lightning wallet via NWC (e.g. [Alby Hub](https://getalby.com/alby-hub?ref=bitcoin-card-topup)).
3. Pick an amount ($10 / $25 / $100 / custom).
4. Pay the Lightning invoice. The atomic swap pays directly to your card's address.

If anything fails, the Lightning hold invoice expires and your sats are released automatically - no refund flow needed.

## Configuration

The LendaSwap API doesn't send CORS headers, so requests are temporarily routed through a tiny pass-through proxy at `https://lendaswap-proxy.fly.dev` (source in [`proxy/`](./proxy)). Override with `VITE_LENDASWAP_API_URL` to point at the API directly (e.g. for local API dev).

### Deploying the proxy

```sh
cd proxy
fly launch --no-deploy   # only first time; accept the existing fly.toml
fly deploy
```
