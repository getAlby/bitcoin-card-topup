import { LightningAddress } from "@getalby/lightning-tools/lnurl";
import { getSatoshiValue } from "@getalby/lightning-tools/fiat";

// Builds a BOLT-11 invoice for `amountUsd` worth of sats at the given Lightning
// address. The caller pays the returned invoice with their connected wallet —
// no swap and no on-chain claim are involved.
export async function createLightningTopupInvoice(params: {
  lightningAddress: string;
  amountUsd: number;
}): Promise<string> {
  const ln = new LightningAddress(params.lightningAddress);
  await ln.fetch();
  const satoshi = await getSatoshiValue({
    amount: params.amountUsd,
    currency: "USD",
  });
  const invoice = await ln.requestInvoice({ satoshi });
  return invoice.paymentRequest;
}
