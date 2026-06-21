import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.mac !== undefined) updates.mac = body.mac;
  if (body.packageName !== undefined) updates.packageName = body.packageName;
  if (body.packageDays !== undefined) updates.packageDays = body.packageDays;
  if (body.packageExpiresAt !== undefined)
    updates.packageExpiresAt = body.packageExpiresAt ? new Date(body.packageExpiresAt) : null;
  if (body.quotaBytes !== undefined) updates.quotaBytes = body.quotaBytes;
  if (body.dailyLimitBytes !== undefined) updates.dailyLimitBytes = body.dailyLimitBytes;
  if (body.active !== undefined) updates.active = body.active;
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 12);
  if (body.resetConsumed) {
    updates.consumedBytes = 0;
    updates.dailyConsumedBytes = 0;
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, Number(id)))
    .returning({ id: users.id, username: users.username });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(users).where(eq(users.id, Number(id)));
  return NextResponse.json({ ok: true });
}
