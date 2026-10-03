import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale } from "../dictionaries";
import { getAuthUser } from "@/lib/supabase/auth";
import { AwardsWorkspace } from "@/components/awards/awards-workspace";
import { AwardsPageSkeleton } from "@/components/awards/award-skeleton";
import { awardsLabel } from "@/lib/awards";
import { socialMetadata } from "@/lib/seo";
import { tri } from "@/lib/ui-text";

type Props = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const title = awardsLabel(lang);
  const description = tri(
    lang,
    "Crie premiações com suas categorias, indicados e vencedores.",
    "Create awards with your own categories, nominees and winners.",
    "Crea premios con tus categorías, nominados y ganadores.",
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: "/awards",
      title,
      description,
      image: `/${lang}/opengraph-image`,
      largeImage: true,
    }),
  };
}
export default async function AwardsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const user = await getAuthUser();
  return (
    <Suspense fallback={<AwardsPageSkeleton />}>
      <AwardsWorkspace
        lang={lang}
        signedIn={Boolean(user)}
        year={new Date().getFullYear()}
      />
    </Suspense>
  );
}
