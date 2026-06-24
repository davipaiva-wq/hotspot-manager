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

    // Reset daily counter if it's a new day (user may have stayed connected overnight)
    const resetDate = user.dailyResetAt
      ? new Date(user.dailyResetAt).toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).split("/").reverse().join("-")
      : null;
    if (resetDate !== today) {
      await db.update(users).set({ dailyConsumedBytes: 0, dailyResetAt: new Date() }).where(eq(users.id, user.id));
      user = { ...user, dailyConsumedBytes: 0, dailyResetAt: new Date() };
    }

    const totalBytes = s.bytesIn + s.bytesOut;
    let newConsumed = user.consumedBytes;
    let newDailyConsumed = user.dailyConsumedBytes;

    // Upsert session record
    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, s.sessionId))
      .limit(1);

    if (existing) {
      const prevTotal = existing.bytesIn + existing.bytesOut;
      const delta = totalBytes - prevTotal;

      // Negative delta means MikroTik reused the same session ID for a new session.
      // Archive the old record (rename its sessionId) and create a fresh one.
      if (delta < 0) {
        await db
          .update(sessions)
          .set({ sessionId: existing.sessionId + "__" + existing.id })
          .where(eq(sessions.id, existing.id));

        await db.insert(sessions).values({
          userId: user.id,
          sessionId: s.sessionId,
          ip: s.ip,
          mac: s.mac,
          bytesIn: s.bytesIn,
          bytesOut: s.bytesOut,
        });

        if (totalBytes > 0) {
          newConsumed = user.consumedBytes + totalBytes;
          newDailyConsumed = user.dailyConsumedBytes + totalBytes;

          await db
            .update(users)
            .set({
              consumedBytes: newConsumed,
              dailyConsumedBytes: newDailyConsumed,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

          const [day] = await db
            .select()
            .from(dailyUsage)
            .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.date, today)))
            .limit(1);

          if (day) {
            await db.update(dailyUsage).set({ bytesTotal: day.bytesTotal + totalBytes }).where(eq(dailyUsage.id, day.id));
          } else {
            await db.insert(dailyUsage).values({ userId: user.id, date: today, bytesTotal: totalBytes });
          }
        }
      } else if (delta > 0) {
        newConsumed = user.consumedBytes + delta;
        newDailyConsumed = user.dailyConsumedBytes + delta;

        await db
          .update(sessions)
          .set({ bytesIn: s.bytesIn, bytesOut: s.bytesOut })
          .where(eq(sessions.id, existing.id));

        await db
          .update(users)
          .set({
            consumedBytes: newConsumed,
            dailyConsumedBytes: newDailyConsumed,
            lastSeenAt: new Date(),
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
      } else {
        // delta === 0: usuário online mas sem novos bytes — só atualiza lastSeenAt
        await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
      }
    } else {
      newConsumed = user.consumedBytes + totalBytes;
      newDailyConsumed = user.dailyConsumedBytes + totalBytes;

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
          consumedBytes: newConsumed,
          dailyConsumedBytes: newDailyConsumed,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    const quotaExceeded = user.quotaBytes > 0 && newConsumed >= user.quotaBytes;
    const dailyExceeded = user.dailyLimitBytes > 0 && newDailyConsumed >= user.dailyLimitBytes;
    const packageExpired = user.packageExpiresAt != null && new Date(user.packageExpiresAt) < new Date();
    const blocked = !user.active;

    if (user.forceDisconnect) {
      await db.update(users).set({ forceDisconnect: false }).where(eq(users.id, user.id));
    }

    const status = (quotaExceeded || dailyExceeded || packageExpired || blocked || user.forceDisconnect) ? "disconnect" : "ok";
    results.push({ mac: s.mac, username: user.username, status });
  }

  return NextResponse.json({ updated: results });
}
