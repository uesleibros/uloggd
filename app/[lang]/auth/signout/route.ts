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
  return response;
}
