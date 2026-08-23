import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromForwarded, ipAllowlistAllows, parseIpAllowlist } from "@tcg/config/http-security";

export function middleware(request: NextRequest) {
  const allowlist = parseIpAllowlist(process.env.ADMIN_IP_ALLOWLIST);
  if (allowlist.length === 0) return NextResponse.next();
  const ip = clientIpFromForwarded(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip") ?? "");
  if (!ipAllowlistAllows(ip, allowlist)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
