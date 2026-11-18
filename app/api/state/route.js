import { NextResponse } from "next/server";
import { liveConfig } from "../../../lib/genlayer";

export const dynamic = "force-dynamic";

// GET -> tells the page whether live mode is configured (never exposes the key)
export async function GET() {
  const cfg = liveConfig();
  return NextResponse.json({ live: !!cfg, contract: cfg ? cfg.address : null });
}
