import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayDate } from "@/lib/utils";

// MikroTik calls this before allowing login.
// Returns { allow: true/false, reason?: string }
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.MIKROTIK_API_KEY) {
    return NextResponse.json({ allow: false, reason: "unauthorized" }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ allow: false, reason: "missing username" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user || !user.active) {
    return NextResponse.json({ allow: false, reason: "user_inactive" });
  }

  // Check total quota (0 = unlimited)
  if (user.quotaBytes > 0 && user.consumedBytes >= user.quotaBytes) {
    return NextResponse.json({ allow: false, reason: "quota_exceeded" });
  }

  // Check daily limit (0 = no daily limit)
  if (user.dailyLimitBytes > 0) {
    const today = todayDate();
    const resetDate = user.dailyResetAt
      ? new Date(user.dailyResetAt).toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).split("/").reverse().join("-")
      : null;

    // Reset daily counter if it's a new day
    if (resetDate !== today) {
      await db
        .update(users)
        .set({ dailyConsumedBytes: 0, dailyResetAt: new Date() })
        .where(eq(users.id, user.id));
    } else if (user.dailyConsumedBytes >= user.dailyLimitBytes) {
      return NextResponse.json({ allow: false, reason: "daily_limit_exceeded" });
    }
  }

  return NextResponse.json({ allow: true });
}
