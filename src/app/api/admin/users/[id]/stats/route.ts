import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, sessions, dailyUsage, macMappings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") return null;
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [macMapping] = await db
    .select({ mac: macMappings.mac, updatedAt: macMappings.updatedAt })
    .from(macMappings)
    .where(eq(macMappings.userId, userId))
    .limit(1);

  const userSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.startedAt))
    .limit(100);

  const daily = await db
    .select()
    .from(dailyUsage)
    .where(eq(dailyUsage.userId, userId))
    .orderBy(desc(dailyUsage.date))
    .limit(30);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      mac: macMapping?.mac ?? user.mac,
      packageName: user.packageName,
      packageExpiresAt: user.packageExpiresAt,
      quotaBytes: user.quotaBytes,
      consumedBytes: user.consumedBytes,
      dailyLimitBytes: user.dailyLimitBytes,
      dailyConsumedBytes: user.dailyConsumedBytes,
      active: user.active,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    },
    sessions: userSessions,
    daily: daily.reverse(),
  });
}
