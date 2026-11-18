import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const key = process.env.GENLAYER_PRIVATE_KEY || generatePrivateKey();
const account = createAccount(key);
const client = createClient({ chain: studionet, account });
const code = readFileSync(new URL("../contracts/mandate_guard.py", import.meta.url), "utf8");
const show = (o) => JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2);

const hash = await client.deployContract({ code, args: [], leaderOnly: false });
console.log("tx:", hash);
const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 60 });
console.log("status:", receipt?.statusName ?? receipt?.status, "| result:", receipt?.resultName ?? receipt?.result);

const candidates = [
  receipt?.data?.contract_address,
  receipt?.txDataDecoded?.contractAddress,
  receipt?.to_address,
  receipt?.recipient,
].filter(Boolean);

let found = null;
for (const address of [...new Set(candidates)]) {
  try {
    await client.readContract({ address, functionName: "get_mandate_count", args: [] });
    found = address;
    break;
  } catch (e) {
    console.log("pas un contrat actif:", address, "-", String(e?.message || e).slice(0, 120));
  }
}
if (!found) {
  console.error("Aucune adresse ne repond. Recu complet:\n" + show(receipt).slice(0, 3000));
  process.exit(1);
}
console.log("MandateGuard OK a l'adresse:", found);
writeFileSync(".env", `GENLAYER_PRIVATE_KEY=${key}\nMANDATE_GUARD_ADDRESS=${found}\n`);
console.log("Fichier .env ecrit. Copie ces DEUX valeurs dans Vercel.");