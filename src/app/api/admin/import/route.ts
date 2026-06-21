import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// One-time bulk import endpoint — protected by SETUP_SECRET
// Upserts users preserving consumedBytes if user already exists
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const importUsers: {
    username: string;
    password: string;
    name?: string;
    packageName?: string;
    packageDays?: number;
    quotaBytes: number;
    consumedBytes: number;
  }[] = body.users;

  const results = [];

  for (const u of importUsers) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id, consumedBytes: users.consumedBytes })
      .from(users)
      .where(eq(users.username, u.username))
      .limit(1);

    if (existing) {
      // Update but keep consumed if already higher (protect against re-import)
      const consumed = Math.max(existing.consumedBytes, u.consumedBytes);
      await db.update(users).set({
        packageName: u.packageName ?? null,
        packageDays: u.packageDays ?? 30,
        quotaBytes: u.quotaBytes,
        consumedBytes: consumed,
        updatedAt: new Date(),
      }).where(eq(users.id, existing.id));
      results.push({ username: u.username, action: "updated", consumedBytes: consumed });
    } else {
      await db.insert(users).values({
        username: u.username,
        passwordHash,
        name: u.name ?? null,
        packageName: u.packageName ?? null,
        packageDays: u.packageDays ?? 30,
        quotaBytes: u.quotaBytes,
        consumedBytes: u.consumedBytes,
        role: "user",
        active: true,
      });
      results.push({ username: u.username, action: "created", consumedBytes: u.consumedBytes });
    }
  }

  return NextResponse.json({ imported: results.length, results });
}
