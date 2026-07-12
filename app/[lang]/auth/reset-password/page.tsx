import { notFound } from "next/navigation";
import { ResetPasswordPanel } from "@/components/auth/reset-password-panel";
import { hasLocale } from "../../dictionaries";
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <main className="login-shell auth-single">
      <ResetPasswordPanel lang={lang} />
    </main>
  );
}
