import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const uid = cookieStore.get("hsp-uid")?.value;
  if (!uid) return NextResponse.redirect(new URL("/hotspot/login", req.url));

  const [user] = await db
    .select({ speedProfile: users.speedProfile })
    .from(users)
    .where(eq(users.id, parseInt(uid)))
    .limit(1);

  const link = req.nextUrl.searchParams.get("link") ?? "";

  const isPremium = user?.speedProfile === "premium";
  const mkUser = isPremium
    ? (process.env.MIKROTIK_HOTSPOT_USER_FAST ?? "hotspot-alta")
    : (process.env.MIKROTIK_HOTSPOT_USER ?? "hotspot");
  const mkPass = process.env.MIKROTIK_HOTSPOT_PASS ?? "hotspot123";

  let target: string;
  try {
    const u = new URL(link);
    u.searchParams.set("username", mkUser);
    u.searchParams.set("password", mkPass);
    target = u.toString();
  } catch {
    target = `http://192.168.85.2/login?username=${mkUser}&password=${mkPass}`;
  }

  return NextResponse.redirect(target);
}
