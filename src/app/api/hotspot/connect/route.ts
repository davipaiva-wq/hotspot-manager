import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const uid = cookieStore.get("hsp-uid")?.value;
  if (!uid) return NextResponse.redirect(new URL("/hotspot/login", req.url));

  const link = req.nextUrl.searchParams.get("link") ?? "";
  const mkUser = process.env.MIKROTIK_HOTSPOT_USER ?? "hotspot";
  const mkPass = process.env.MIKROTIK_HOTSPOT_PASS ?? "hotspot123";

  let target: string;
  try {
    const u = new URL(link);
    u.searchParams.set("username", mkUser);
    u.searchParams.set("password", mkPass);
    // Remove original dst so MikroTik falls through to status.html → portal
    u.searchParams.delete("dst");
    target = u.toString();
  } catch {
    target = `http://192.168.85.2/login?username=${mkUser}&password=${mkPass}`;
  }

  return NextResponse.redirect(target);
}
