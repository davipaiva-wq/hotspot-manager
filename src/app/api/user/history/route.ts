import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { dailyUsage, sessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  const [usage, history] = await Promise.all([
    db
      .select()
      .from(dailyUsage)
      .where(eq(dailyUsage.userId, userId))
      .orderBy(desc(dailyUsage.date))
      .limit(30),
    db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.startedAt)),
  ]);

  return NextResponse.json({ daily: usage, sessions: history });
}
