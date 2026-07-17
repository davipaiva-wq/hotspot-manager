import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.select().from(users).where(eq(users.role, "user"));

  const now = new Date();
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
  }

  return NextResponse.json({ ok: true, renewed: allUsers.length });
}
