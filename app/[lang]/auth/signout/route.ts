import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "../../dictionaries";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "pt-BR";
  const response = NextResponse.redirect(
    new URL(`/${locale}/login`, request.url),
    303,
  );
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) =>
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );
  await supabase.auth.signOut();
  // The proxy's own two, which say "this account is active" and "this account
  // finished onboarding" and are keyed to the id that is leaving. They outlive
  // the session by design, and the active one is how the proxy skips asking
  // whether somebody is suspended: left behind, a suspended account could sign
  // out, sign back in and pass that check for the next minute.
  for (const name of ["uloggd-active", "uloggd-onboarded"])
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  return response;
}
