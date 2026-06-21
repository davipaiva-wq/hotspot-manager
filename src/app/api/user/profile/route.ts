import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      quotaBytes: users.quotaBytes,
      consumedBytes: users.consumedBytes,
      dailyLimitBytes: users.dailyLimitBytes,
      dailyConsumedBytes: users.dailyConsumedBytes,
      dailyResetAt: users.dailyResetAt,
    })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  return NextResponse.json(user);
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
