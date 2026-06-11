import { NostrWebLNProvider } from "@getalby/sdk";
import type { Nip47TransactionMetadata } from "@getalby/sdk";
import type { WebLNProvider } from "@webbtc/webln-types";

// Pay a BOLT-11 invoice with the connected wallet. NWC connections expose an
// NWCClient that lets us attach metadata to the payment, which the wallet stores
// on the transaction so it can be identified later; other providers only offer
// the metadata-less WebLN `sendPayment`.
export async function payInvoice(
  provider: WebLNProvider,
  bolt11: string,
  metadata?: Nip47TransactionMetadata,
): Promise<void> {
  if (metadata && provider instanceof NostrWebLNProvider) {
    await provider.client.payInvoice({ invoice: bolt11, metadata });
    return;
  }
  await provider.sendPayment(bolt11);
}
