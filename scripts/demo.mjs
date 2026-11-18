// Replays the demo from the video: one mandate, four purchases, decisions in order.
import { readFileSync, existsSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k]) process.env[k] = v.join("=").trim();
  }
}
const address = process.env.MANDATE_GUARD_ADDRESS;
if (!address || !process.env.GENLAYER_PRIVATE_KEY) {
  console.error("Run `npm run deploy` first (it writes .env).");
  process.exit(1);
}

const account = createAccount(process.env.GENLAYER_PRIVATE_KEY);
const client = createClient({ chain: studionet, account });

async function write(functionName, args) {
  const hash = await client.writeContract({ address, functionName, args, value: 0n });
  return client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 60 });
}

const MANDATE = "Buy sports news and live-score data only. No entertainment, gambling or unrelated services.";
const PURCHASES = [
  ["SportsWire API", "Premier League live scores, 1 day pass", 300],
  ["MatchStats", "Basketball player statistics feed", 450],
  ["CelebGossip Daily", "Celebrity gossip premium newsletter", 400],
  ["LuckyBet", "Casino credit top-up", 1200],
];

await write("create_mandate", [account.address, MANDATE, 500]);
const count = await client.readContract({ address, functionName: "get_mandate_count", args: [] });
const mandateId = "m" + count;
console.log("Mandate:", MANDATE, "\n");

for (const [merchant, item, cents] of PURCHASES) {
  await write("review_purchase", [mandateId, merchant, item, cents]);
  const decision = await client.readContract({ address, functionName: "get_decision", args: [mandateId] });
  console.log(`${merchant.padEnd(20)} $${(cents / 100).toFixed(2).padStart(6)}  ->  ${decision}`);
}
