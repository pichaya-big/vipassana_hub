import { NextResponse, type NextRequest } from "next/server";

// Sends visitors without a session cookie to the login page.
// This only checks that the cookie exists. The Node.js API verifies the token on every request.
const SESSION_COOKIE = "vh_session";

export function proxy(req: NextRequest) {
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/lesson/:path*", "/admin/:path*", "/final-exam/:path*"],
};
