// Deploys contracts/mandate_guard.py to GenLayer StudioNet and prints its address.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const key = process.env.GENLAYER_PRIVATE_KEY || generatePrivateKey();
const account = createAccount(key);
const client = createClient({ chain: studionet, account });

const code = readFileSync(new URL("../contracts/mandate_guard.py", import.meta.url), "utf8");
console.log("Deploying MandateGuard from", account.address, "...");

const hash = await client.deployContract({ code, args: [], leaderOnly: false });
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 60,
});
const address = receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress;
if (!address) {
  console.error("Deployed, but could not read the address from the receipt:", receipt);
  process.exit(1);
}
console.log("MandateGuard deployed at:", address);

if (!existsSync(".env")) {
  writeFileSync(".env", `GENLAYER_PRIVATE_KEY=${key}\nMANDATE_GUARD_ADDRESS=${address}\n`);
  console.log("Wrote .env (throwaway testnet key + address).");
} else {
  console.log("Add this line to your .env:\nMANDATE_GUARD_ADDRESS=" + address);
}
