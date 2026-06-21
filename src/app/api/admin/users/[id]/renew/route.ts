import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") return null;
  return session;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const [user] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Calcula nova validade: hoje + packageDays
  // Se o usuário já tem validade futura, parte dela para evitar perda de dias
  const base = user.packageExpiresAt && new Date(user.packageExpiresAt) > new Date()
    ? new Date(user.packageExpiresAt)
    : new Date();

  const days = body.days ?? user.packageDays ?? 30;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + days);

  await db.update(users).set({
    consumedBytes: 0,
    dailyConsumedBytes: 0,
    packageExpiresAt: newExpiry,
    packageDays: days,
    lastRenewedAt: new Date(),
    active: true,
    updatedAt: new Date(),
  }).where(eq(users.id, Number(id)));

  return NextResponse.json({
    ok: true,
    username: user.username,
    newExpiry: newExpiry.toISOString(),
    days,
  });
}
