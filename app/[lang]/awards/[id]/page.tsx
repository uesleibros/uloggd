import { cache } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "../../dictionaries";
import { serverApi, settleServer } from "@/lib/api-server";
import { ApiError } from "@/lib/api-client";
import { contentKey } from "@/lib/public-id";
import { socialMetadata, privatePageMetadata } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import type { AwardAnswer } from "@/lib/awards";
import { AwardDetail } from "@/components/awards/award-detail";
import { ReloadError } from "@/components/ui/reload-error";

type Props = { params: Promise<{ lang: string; id: string }> };
const read = cache((id: string) =>
  settleServer(serverApi.get<AwardAnswer>(`/awards/${id}`)),
);
export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !contentKey(id)) return privatePageMetadata;
  const { data } = await read(id);
  if (
    !data ||
    data.data.status !== "PUBLISHED" ||
    data.data.visibility !== "PUBLIC"
  )
    return privatePageMetadata;
  const title = data.data.name;
  const description = tri(
    lang,
    `${data.data.year}: premiação de @${data.author.username}.`,
    `${data.data.year}: awards by @${data.author.username}.`,
    `${data.data.year}: premios de @${data.author.username}.`,
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/awards/${data.data.public_id}`,
      title,
      description,
      image: `/${lang}/opengraph-image`,
      largeImage: true,
    }),
  };
}
export default async function AwardPage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !contentKey(id)) notFound();
  const { data, error } = await read(id);
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 403)
  )
    notFound();
  if (!data)
    return (
      <main className="awards-page">
        <ReloadError lang={lang} />
      </main>
    );
  return (
    <AwardDetail
      key={`${data.data.id}:${data.data.version}`}
      initial={data}
      lang={lang}
    />
  );
}
