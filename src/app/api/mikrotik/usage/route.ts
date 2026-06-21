import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions, dailyUsage, macMappings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { todayDate } from "@/lib/utils";

// MikroTik scheduler POSTs usage every N minutes.
// Body: { sessions: [{ username, sessionId, ip, mac, bytesIn, bytesOut }] }
// With generic hotspot user, we resolve the real user via mac_mappings table.
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.MIKROTIK_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const activeSessions: {
    username: string;
    sessionId: string;
    ip: string;
    mac: string;
    bytesIn: number;
    bytesOut: number;
  }[] = body.sessions ?? [];

  const today = todayDate();
  const results: { mac: string; username: string; status: string }[] = [];

  for (const s of activeSessions) {
    // Try to find user by MAC mapping first (handles generic hotspot user case)
    let user = null;

    if (s.mac) {
      const [mapping] = await db
        .select({ userId: macMappings.userId })
        .from(macMappings)
        .where(eq(macMappings.mac, s.mac))
        .limit(1);

      if (mapping) {
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.id, mapping.userId))
          .limit(1);
        user = found ?? null;
      }
    }

    // Fallback: look up by username (works when individual users are used)
    if (!user && s.username && s.username !== "hotspot") {
      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.username, s.username))
        .limit(1);
      user = found ?? null;
    }

    if (!user) {
      results.push({ mac: s.mac, username: s.username, status: "not_found" });
      continue;
    }

    const totalBytes = s.bytesIn + s.bytesOut;

    // Upsert session record
    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, s.sessionId))
      .limit(1);

    if (existing) {
      const delta = totalBytes - (existing.bytesIn + existing.bytesOut);
      if (delta > 0) {
        await db
          .update(sessions)
          .set({ bytesIn: s.bytesIn, bytesOut: s.bytesOut })
          .where(eq(sessions.id, existing.id));

        await db
          .update(users)
          .set({
            consumedBytes: user.consumedBytes + delta,
            dailyConsumedBytes: user.dailyConsumedBytes + delta,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        const [day] = await db
          .select()
          .from(dailyUsage)
          .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.date, today)))
          .limit(1);

        if (day) {
          await db
            .update(dailyUsage)
            .set({ bytesTotal: day.bytesTotal + delta })
            .where(eq(dailyUsage.id, day.id));
        } else {
          await db.insert(dailyUsage).values({ userId: user.id, date: today, bytesTotal: delta });
        }
      }
    } else {
      await db.insert(sessions).values({
        userId: user.id,
        sessionId: s.sessionId,
        ip: s.ip,
        mac: s.mac,
        bytesIn: s.bytesIn,
        bytesOut: s.bytesOut,
      });

      await db
        .update(users)
        .set({
          consumedBytes: user.consumedBytes + totalBytes,
          dailyConsumedBytes: user.dailyConsumedBytes + totalBytes,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    results.push({ mac: s.mac, username: user.username, status: "ok" });
  }

  return NextResponse.json({ updated: results });
}
