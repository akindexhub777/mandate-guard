import { NextResponse } from "next/server";
import { getClient, liveConfig, write } from "../../../lib/genlayer";

export const maxDuration = 60;

// POST { text, capUsd } -> { mode, mandateId }
export async function POST(req) {
  const { text, capUsd } = await req.json();
  if (typeof text !== "string" || text.trim().length < 10 || !(capUsd > 0)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const cfg = liveConfig();
  if (!cfg) return NextResponse.json({ mode: "sample", mandateId: "sample" });
  try {
    const { client, account } = getClient(cfg.key);
    const tx = await write(client, cfg.address, "create_mandate", [
      account.address,
      text.trim().slice(0, 1000),
      Math.round(capUsd * 100),
    ]);
    const count = await client.readContract({ address: cfg.address, functionName: "get_mandate_count", args: [] });
    return NextResponse.json({ mode: "live", mandateId: "m" + count, tx });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
