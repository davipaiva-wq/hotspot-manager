import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "user"));

  const now = new Date();
  let renewed = 0;

  for (const user of allUsers) {
    const days = user.packageDays ?? 30;
    const newExpiry = new Date(now);
    newExpiry.setDate(newExpiry.getDate() + days);

    await db.update(users).set({
      consumedBytes: 0,
      dailyConsumedBytes: 0,
      packageExpiresAt: newExpiry,
      lastRenewedAt: now,
      active: true,
      updatedAt: now,
    }).where(eq(users.id, user.id));

    renewed++;
  }

  return NextResponse.json({ ok: true, renewed, at: now.toISOString() });
}
