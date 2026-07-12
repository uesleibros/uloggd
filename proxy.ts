import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "./app/[lang]/dictionaries";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return;

  const preferred = request.headers.get("accept-language")?.toLowerCase();
  const locale = preferred?.startsWith("en") ? "en" : defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
