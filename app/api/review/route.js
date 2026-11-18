import { NextResponse } from "next/server";
import { getClient, liveConfig, write } from "../../../lib/genlayer";

export const maxDuration = 60;

// POST { mandateId, merchant, item, amountUsd } -> { mode, decision, reviews }
export async function POST(req) {
  const { mandateId, merchant, item, amountUsd } = await req.json();
  if (!/^m\d+$/.test(mandateId || "") || !merchant || !item || !(amountUsd >= 0)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const cfg = liveConfig();
  if (!cfg) return NextResponse.json({ error: "live_mode_not_configured" }, { status: 400 });
  try {
    const { client } = getClient(cfg.key);
    await write(client, cfg.address, "review_purchase", [
      mandateId,
      String(merchant).slice(0, 200),
      String(item).slice(0, 600),
      Math.round(amountUsd * 100),
    ]);
    const decision = await client.readContract({ address: cfg.address, functionName: "get_decision", args: [mandateId] });
    const reviews = JSON.parse(
      await client.readContract({ address: cfg.address, functionName: "get_reviews", args: [mandateId] })
    );
    return NextResponse.json({ mode: "live", decision, reviews });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
