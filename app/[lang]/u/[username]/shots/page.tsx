import Image from "next/image";
import Link from "next/link";
import { EyeOff, Images } from "lucide-react";
import { notFound } from "next/navigation";
import { getGamesByIds } from "@/lib/igdb";
import { getSupabase } from "@/lib/supabase/auth";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../../../dictionaries";

type Props = { params: Promise<{ lang: string; username: string }> };

export default async function ScreenshotGalleryPage({ params }: Props) {
  const { lang, username } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name")
    .ilike("username", username)
    .maybeSingle();
  if (!profile) notFound();
  const { data: shots } = await supabase
    .from("screenshots")
    .select(
      "id,public_id,igdb_id,game_slug,storage_path,description,contains_spoilers,width,height,created_at",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const [{ data: signed }, games] = await Promise.all([
    shots?.length
      ? supabase.storage.from("screenshots").createSignedUrls(
          shots.map((shot) => shot.storage_path),
          3600,
        )
      : Promise.resolve({ data: [] }),
    getGamesByIds((shots ?? []).map((shot) => shot.igdb_id)),
  ]);
  const urlByPath = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl]),
  );
  const gameById = new Map(games.map((game) => [game.id, game]));
  return (
    <main className="social-page screenshot-gallery-page">
      <header className="screenshot-gallery-header">
        <span>
          <Images size={16} /> {tri(lang, "GALERIA", "GALLERY", "GALERÍA")}
        </span>
        <h1>
          {tri(
            lang,
            `Capturas de ${profile.display_name || `@${profile.username}`}`,
            `${profile.display_name || `@${profile.username}`}'s screenshots`,
            `Capturas de ${profile.display_name || `@${profile.username}`}`,
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Momentos salvos da biblioteca e das jornadas.",
            "Saved moments from the library and play journeys.",
            "Momentos guardados de la biblioteca y los recorridos.",
          )}
        </p>
      </header>
      {shots?.length ? (
        <div className="screenshot-gallery-grid">
          {shots.map((shot) => {
            const url = urlByPath.get(shot.storage_path);
            if (!url) return null;
            const game = gameById.get(shot.igdb_id);
            return (
              <Link
                href={`/${lang}/shot/${shot.public_id}`}
                key={shot.id}
                className="screenshot-gallery-card"
              >
                <span className="screenshot-gallery-media">
                  <Image
                    src={url}
                    alt={shot.description || game?.name || shot.game_slug}
                    width={shot.width}
                    height={shot.height}
                    sizes="(max-width: 620px) 50vw, (max-width: 1100px) 33vw, 280px"
                    unoptimized
                  />
                  {shot.contains_spoilers && (
                    <i>
                      <EyeOff size={16} />{" "}
                      {tri(lang, "Spoiler", "Spoiler", "Spoiler")}
                    </i>
                  )}
                </span>
                <strong>{game?.name ?? shot.game_slug}</strong>
                {shot.description && <small>{shot.description}</small>}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="social-empty">
          <span>
            <Images size={22} />
          </span>
          <h2>
            {tri(
              lang,
              "Nenhuma captura ainda",
              "No screenshots yet",
              "Aún no hay capturas",
            )}
          </h2>
        </div>
      )}
    </main>
  );
}
