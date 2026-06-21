import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

// One-time setup endpoint — creates the first admin if no admins exist.
// Protected by SETUP_SECRET env var.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const username = body.username ?? "admin";
  const password = body.password ?? "admin123";

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash, name: "Administrador", role: "admin", quotaBytes: 0 })
    .onConflictDoNothing()
    .returning({ id: users.id, username: users.username });

  if (!user) {
    return NextResponse.json({ message: "Admin já existe." });
  }

  return NextResponse.json({ created: user });
}
