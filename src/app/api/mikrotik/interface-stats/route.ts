import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interfaceStats } from "@/db/schema";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.MIKROTIK_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ether1_rx, ether1_tx, bridge_rx, bridge_tx } = body;

  if (
    typeof ether1_rx !== "number" ||
    typeof ether1_tx !== "number" ||
    typeof bridge_rx !== "number" ||
    typeof bridge_tx !== "number"
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await db.insert(interfaceStats).values({
    ether1RxBytes: ether1_rx,
    ether1TxBytes: ether1_tx,
    bridgeRxBytes: bridge_rx,
    bridgeTxBytes: bridge_tx,
  });

  return NextResponse.json({ ok: true });
}
