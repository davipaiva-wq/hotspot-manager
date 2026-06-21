import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const link = req.nextUrl.searchParams.get("link") ?? "";
  const mkUser = process.env.MIKROTIK_HOTSPOT_USER ?? "hotspot";
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
