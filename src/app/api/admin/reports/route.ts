import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, dailyUsage, sessions } from "@/db/schema";
import { eq, gte, lte, and, desc } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD
  const userId = searchParams.get("userId");

  // Daily usage report
  const conditions = [];
  if (from) conditions.push(gte(dailyUsage.date, from));
  if (to) conditions.push(lte(dailyUsage.date, to));
  if (userId) conditions.push(eq(dailyUsage.userId, Number(userId)));

  const usageRows = await db
    .select({
      date: dailyUsage.date,
      bytesTotal: dailyUsage.bytesTotal,
      userId: dailyUsage.userId,
      username: users.username,
      name: users.name,
    })
    .from(dailyUsage)
    .leftJoin(users, eq(dailyUsage.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(dailyUsage.date));

  // Recent sessions
  const recentSessions = await db
    .select({
      id: sessions.id,
      username: users.username,
      ip: sessions.ip,
      mac: sessions.mac,
      bytesIn: sessions.bytesIn,
      bytesOut: sessions.bytesOut,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .orderBy(desc(sessions.startedAt))
    .limit(100);

  return NextResponse.json({ usage: usageRows, sessions: recentSessions });
}
