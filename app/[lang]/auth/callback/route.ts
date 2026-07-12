import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";
import { safeInternalNext } from "@/lib/auth-validation";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/[lang]/auth/callback">,
) {
  const { lang } = await params;
  if (!hasLocale(lang)) {
    return NextResponse.redirect(
      new URL("/pt-BR/login?error=locale", request.url),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalNext(request.nextUrl.searchParams.get("next"), lang);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile) await supabase.from("profiles").insert({ id: user.id });
        if (!profile?.username && !next.endsWith("/auth/reset-password"))
          return NextResponse.redirect(
            new URL(`/${lang}/onboarding/username`, request.url),
          );
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(`/${lang}/login?error=oauth`, request.url),
  );
}
