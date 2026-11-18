import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export function liveConfig() {
  const address = process.env.MANDATE_GUARD_ADDRESS;
  const key = process.env.GENLAYER_PRIVATE_KEY;
  return address && key ? { address, key } : null;
}

export function getClient(key) {
  const account = createAccount(key);
  return { account, client: createClient({ chain: studionet, account }) };
}

export async function write(client, address, functionName, args) {
  const hash = await client.writeContract({ address, functionName, args, value: 0n });
  await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 90 });
  return hash;
}
