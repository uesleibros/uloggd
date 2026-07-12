import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";

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
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next =
    requestedNext?.startsWith(`/${lang}`) && !requestedNext.startsWith("//")
      ? requestedNext
      : `/${lang}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`/${lang}/login?error=oauth`, request.url),
  );
}
