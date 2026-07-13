import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "./app/[lang]/dictionaries";

const publicSegments = new Set([
  "",
  "login",
  "auth",
  "legal",
  "onboarding",
  "game",
  "u",
  "lists",
]);
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lang = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (!lang) {
    const preferred = request.headers.get("accept-language")?.toLowerCase();
    request.nextUrl.pathname = `/${preferred?.startsWith("en") ? "en" : defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const segment = pathname.slice(lang.length + 2).split("/")[0] || "";
  if (segment === "explore")
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  if (!user) {
    const privateListsIndex = pathname === `/${lang}/lists`;
    const privateGameLogs = /^\/(pt-BR|en)\/game\/[^/]+\/logs$/.test(pathname);
    if (!publicSegments.has(segment) || privateListsIndex || privateGameLogs) {
      const url = new URL(`/${lang}/login`, request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const onboarding = pathname.startsWith(`/${lang}/onboarding`);
  const callback = pathname.startsWith(`/${lang}/auth/callback`);
  const reset = pathname.startsWith(`/${lang}/auth/reset-password`);
  const signout = pathname.startsWith(`/${lang}/auth/signout`);
  if (!profile?.username && !onboarding && !callback && !reset && !signout)
    return NextResponse.redirect(
      new URL(`/${lang}/onboarding/username`, request.url),
    );
  if (profile?.username && onboarding)
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  if (user && pathname === `/${lang}/login`)
    return NextResponse.redirect(
      new URL(
        profile?.username ? `/${lang}` : `/${lang}/onboarding/username`,
        request.url,
      ),
    );
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
