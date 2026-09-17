import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Images } from "lucide-react";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { ShotsGallery } from "@/components/social/shots-gallery";
import { ProfileSummaryCount } from "@/components/social/profile-summary-count";
import { socialMetadata } from "@/lib/seo";
import { getAuthUser } from "@/lib/supabase/auth";
import { getPublicProfile } from "@/lib/profiles";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale, resolveLocale } from "../../dictionaries";
import "../../profile.css";

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    spoilers?: string;
    sort?: string;
    game?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const profile = (await getPublicProfile(username))?.data;
  if (!profile?.username) return {};
  const name = profile.display_name || `@${profile.username}`;
  const description = tri(
    lang,
    `As capturas que @${profile.username} publicou no uloggd.`,
    `The screenshots @${profile.username} has published on uloggd.`,
    `Las capturas que @${profile.username} ha publicado en uloggd.`,
  );
  const title = tri(
    lang,
    `Capturas de ${name}`,
    `${name}'s screenshots`,
    `Capturas de ${name}`,
  );
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/shots/${profile.username}`,
      title,
      description,
      type: "profile",
    }),
  };
}

export default async function ScreenshotsGalleryPage({ params }: Props) {
  // The filters live in the URL and the gallery reads them itself, so this no
  // longer needs them: the frame is the same page whichever filter is on.
  const { lang: rawLang, username } = await params;
  if (!hasLocale(rawLang)) notFound();
  const lang = resolveLocale(rawLang);
  const [response, viewer] = await Promise.all([
    getPublicProfile(username),
    getAuthUser(),
  ]);
  const profile = response?.data;
  if (!profile?.username) notFound();

  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;
  const base = `/${lang}/shots/${profile.username}`;
  const isOwner = viewer?.id === profile.id;

  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          `Capturas de ${name}`,
          `${name}'s screenshots`,
          `Capturas de ${name}`,
        )}
        description={tri(
          lang,
          `A galeria pública de momentos que @${profile.username} guardou.`,
          `The public gallery of moments @${profile.username} kept.`,
          `La galería pública de momentos que @${profile.username} guardó.`,
        )}
        stats={[
          {
            icon: <Images size={14} />,
            label: tri(lang, "Capturas", "Screenshots", "Capturas"),
            value: (
              <ProfileSummaryCount
                username={profile.username}
                field="screenshots"
              />
            ),
          },
        ]}
      />
      <div className="workspace-page-body reviews-workspace">
        <Link
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>

        <ShotsGallery
          username={profile.username}
          lang={lang}
          base={base}
          isOwner={isOwner}
        />
      </div>
    </main>
  );
}
