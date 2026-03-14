import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Protected routes require auth
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect these routes
export const config = {
  matcher: [
    "/builder/:path*", 
    "/projects/:path*", 
    "/deploy/:path*",
    "/dashboard/:path*",
    "/billing/:path*",
    "/profile/:path*"
  ],
};
