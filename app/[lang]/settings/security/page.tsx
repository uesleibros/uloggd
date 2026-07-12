import { notFound } from "next/navigation";
import { hasLocale } from "../../dictionaries";
import { SecurityPanel } from "@/components/auth/security-panel";
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <SecurityPanel lang={lang} />;
}
