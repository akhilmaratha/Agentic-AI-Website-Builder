import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { extractClientIp, incrementRateLimit } from "@/lib/rateLimit";

const PROTECTED_PATHS = ["/builder", "/projects", "/deploy", "/dashboard", "/billing", "/profile"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (pathname.startsWith("/api")) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = extractClientIp(forwardedFor, realIp || "unknown");
    const userId =
      (typeof token?.sub === "string" && token.sub) ||
      (typeof token?.email === "string" && token.email) ||
      "anonymous";

    const rate = await incrementRateLimit({
      key: `rate_limit:global:${ip}:${userId}`,
      limit: 100,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return NextResponse.next();
  }

  const isProtectedPage = PROTECTED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtectedPage && !token) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Protect these routes
export const config = {
  matcher: [
    "/api/:path*",
    "/builder/:path*", 
    "/projects/:path*", 
    "/deploy/:path*",
    "/dashboard/:path*",
    "/billing/:path*",
    "/profile/:path*"
  ],
};
