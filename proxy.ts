import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "./app/[lang]/dictionaries";
import { getOwnAgeProfile } from "./lib/own-age-profile";
import { AUTH_COOKIE_OPTIONS } from "./lib/supabase/cookie-options";

const ONBOARDED_COOKIE = "uloggd-onboarded";
const publicSegments = new Set([
  "",
  "login",
  "auth",
  "legal",
  "onboarding",
  "game",
  "search",
  "verification",
  "u",
  "lists",
  "library",
  "reviews",
  "shots",
  // Public community documents are protected by their own row-level
  // visibility rules. Keeping the detail routes public lets shared links and
  // search crawlers reach PUBLIC posts while FOLLOWERS/private rows still
  // resolve as unavailable for anonymous visitors.
  "entry",
  "journal",
  "review",
  "shot",
  // Company pages are catalogue data, same as /game, nothing on them depends
  // on who is looking, so they stay reachable without an account.
  "company",
  "publisher",
  // Where dead URLs land; gating it behind auth would turn every 404 into a
  // login redirect again.
  "not-found",
]);
// Every top-level segment the app actually serves. A path outside this set has
// no page behind it, and the proxy is the only place that can still set a real
// 404 status: once the layout's Suspense shell starts streaming, the response
// headers are already gone and notFound() can only mark the HTML noindex.
const knownSegments = new Set([
  ...publicSegments,
  "explore",
  "moderation",
  "settings",
  "suspended",
  "wallet",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lang = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (!lang) {
    const preferred = request.headers.get("accept-language")?.toLowerCase();
    // Only the language subtag matters here: pt-PT and pt-BR both land on
    // Portuguese, es-419 and es-ES both on Spanish.
    const detected = preferred?.startsWith("en")
      ? "en"
      : preferred?.startsWith("es")
        ? "es"
        : defaultLocale;
    request.nextUrl.pathname = `/${detected}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }
  const segment = pathname.slice(lang.length + 2).split("/")[0] || "";
  let response = NextResponse.next({ request });
  if (process.env.ULOGGD_E2E === "1") return response;
  // Before the auth checks: a URL that matches no route is not a login problem,
  // and bouncing it to /login told crawlers the page exists. Rewriting instead
  // of redirecting keeps the dead URL in the address bar, which is what a 404
  // is supposed to do.
  if (!knownSegments.has(segment))
    return NextResponse.rewrite(new URL(`/${lang}/not-found`, request.url), {
      status: 404,
    });
  if (segment === "explore")
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  // The screenshot gallery moved to its own workspace. Redirected here rather
  // than from the page, because `permanentRedirect` in a component never
  // reaches the wire once the layout has started streaming: the request answers
  // 200 with an empty shell instead of a redirect. The proxy runs first and can
  // still set a real status.
  const legacyShots = new RegExp(`^/${lang}/u/([^/]+)/shots/?$`).exec(pathname);
  if (legacyShots)
    return NextResponse.redirect(
      new URL(`/${lang}/shots/${legacyShots[1]}`, request.url),
      308,
    );
  const hasAuthCookies = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));
  if (!hasAuthCookies) {
    const privateWorkspaceIndex = ["lists", "library", "reviews", "shots"].some(
      (workspace) => pathname === `/${lang}/${workspace}`,
    );
    const privateGameLogs = new RegExp(`^/${lang}/game/[^/]+/logs$`).test(
      pathname,
    );
    if (
      !publicSegments.has(segment) ||
      privateWorkspaceIndex ||
      privateGameLogs
    ) {
      const url = new URL(`/${lang}/login`, request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
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
  // Verifies the JWT locally (asymmetric signing keys) instead of a
  // round-trip to the Auth server; still refreshes expiring sessions.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims.sub ? { id: claimsData.claims.sub } : null;
  if (!user) {
    const privateWorkspaceIndex = ["lists", "library", "reviews", "shots"].some(
      (workspace) => pathname === `/${lang}/${workspace}`,
    );
    const privateGameLogs = new RegExp(`^/${lang}/game/[^/]+/logs$`).test(
      pathname,
    );
    if (
      !publicSegments.has(segment) ||
      privateWorkspaceIndex ||
      privateGameLogs
    ) {
      const url = new URL(`/${lang}/login`, request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }
  const onboarding = pathname.startsWith(`/${lang}/onboarding`);
  const callback = pathname.startsWith(`/${lang}/auth/callback`);
  const reset = pathname.startsWith(`/${lang}/auth/reset-password`);
  const signout = pathname.startsWith(`/${lang}/auth/signout`);
  const mfaChallenge = pathname.startsWith(`/${lang}/auth/mfa`);
  const suspendedScreen = pathname === `/${lang}/suspended`;

  // A suspended account is locked out of the whole site, so this runs before
  // onboarding and MFA. Signing out stays reachable, otherwise they would have
  // no way to leave the account. Reads their own row, allowed by RLS.
  if (!signout && !callback) {
    const { data: suspension } = await supabase.rpc("profile_suspension", {
      target: user.id,
    });
    const suspended = Boolean(suspension?.length);
    if (suspended && !suspendedScreen)
      return NextResponse.redirect(new URL(`/${lang}/suspended`, request.url));
    if (!suspended && suspendedScreen)
      return NextResponse.redirect(new URL(`/${lang}`, request.url));
  }
  // Onboarding never becomes incomplete again once finished, so a cookie
  // scoped to the user id lets us skip the profiles query on every request.
  let onboardingIncomplete =
    request.cookies.get(ONBOARDED_COOKIE)?.value !== user.id;
  if (onboardingIncomplete) {
    // `birth_date` left the readable columns of `profiles`, so it comes from
    // the definer function that scopes it to the caller. Both run on the same
    // cookie miss, which the cookie above keeps rare.
    const [{ data: profile }, age] = await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle(),
      getOwnAgeProfile(supabase),
    ]);
    onboardingIncomplete = !profile?.username || !age?.birth_date;
    if (!onboardingIncomplete)
      response.cookies.set(ONBOARDED_COOKIE, user.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
  }
  if (!mfaChallenge && !callback && !reset && !signout) {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
      const url = new URL(`/${lang}/auth/mfa`, request.url);
      url.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
  if (onboardingIncomplete && !onboarding && !callback && !reset && !signout)
    return NextResponse.redirect(
      new URL(`/${lang}/onboarding/username`, request.url),
    );
  if (!onboardingIncomplete && onboarding)
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  if (user && pathname === `/${lang}/login`)
    return NextResponse.redirect(
      new URL(
        onboardingIncomplete ? `/${lang}/onboarding/username` : `/${lang}`,
        request.url,
      ),
    );
  return response;
}
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
