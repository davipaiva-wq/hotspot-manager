import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, dailyUsage } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { todayDate } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      packageName: users.packageName,
      packageExpiresAt: users.packageExpiresAt,
      packageDays: users.packageDays,
      lastRenewedAt: users.lastRenewedAt,
      quotaBytes: users.quotaBytes,
      consumedBytes: users.consumedBytes,
      dailyLimitBytes: users.dailyLimitBytes,
      dailyConsumedBytes: users.dailyConsumedBytes,
      dailyResetAt: users.dailyResetAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [todayRow] = await db
    .select({ bytesTotal: dailyUsage.bytesTotal })
    .from(dailyUsage)
    .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, todayDate())))
    .limit(1);

  return NextResponse.json({ ...user, dailyConsumedBytes: todayRow?.bytesTotal ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Senha atual obrigatória" }, { status: 400 });
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, Number(session.user.id)))
      .limit(1);

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, Number(session.user.id)));
  }

  if (body.dailyLimitBytes !== undefined) {
    await db
      .update(users)
      .set({ dailyLimitBytes: body.dailyLimitBytes, updatedAt: new Date() })
      .where(eq(users.id, Number(session.user.id)));
  }

  return NextResponse.json({ ok: true });
}
