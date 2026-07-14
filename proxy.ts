import { NextRequest, NextResponse } from "next/server";
import { isValidAuthCookie, AUTH_COOKIE } from "@/lib/auth";

// Every page load is verified server-side. Wrong/missing cookie → /pin.
export default async function proxy(req: NextRequest) {
  const ok = await isValidAuthCookie(req.cookies.get(AUTH_COOKIE.name)?.value);
  const isPinPage = req.nextUrl.pathname === "/pin";

  if (!ok && !isPinPage) {
    return NextResponse.redirect(new URL("/pin", req.url));
  }
  if (ok && isPinPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static assets, the service worker, manifest and icons.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/).*)"],
};
