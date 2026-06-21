import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dailyUsage, sessions } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [usage, history] = await Promise.all([
    db
      .select()
      .from(dailyUsage)
      .where(eq(dailyUsage.userId, userId))
      .orderBy(desc(dailyUsage.date)),
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gte(sessions.startedAt, startOfMonth)))
      .orderBy(desc(sessions.startedAt)),
  ]);

  return NextResponse.json({ daily: usage, sessions: history });
}
