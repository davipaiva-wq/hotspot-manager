import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const all = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      mac: users.mac,
      role: users.role,
      packageName: users.packageName,
      packageExpiresAt: users.packageExpiresAt,
      quotaBytes: users.quotaBytes,
      consumedBytes: users.consumedBytes,
      dailyLimitBytes: users.dailyLimitBytes,
      dailyConsumedBytes: users.dailyConsumedBytes,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, name, mac, packageName, packageExpiresAt, quotaBytes, dailyLimitBytes, role } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "username e password obrigatórios" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      name: name ?? null,
      mac: mac ?? null,
      packageName: packageName ?? null,
      packageExpiresAt: packageExpiresAt ? new Date(packageExpiresAt) : null,
      quotaBytes: quotaBytes ?? 0,
      dailyLimitBytes: dailyLimitBytes ?? 0,
      role: role ?? "user",
    })
    .returning({ id: users.id, username: users.username });

  return NextResponse.json(user, { status: 201 });
}
