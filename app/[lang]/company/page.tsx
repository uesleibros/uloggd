import { permanentRedirect } from "next/navigation";
import { hasLocale } from "../dictionaries";

export default async function CompanyDirectory({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  permanentRedirect(
    `/${hasLocale(lang) ? lang : "pt-BR"}/search?scope=companies`,
  );
}
