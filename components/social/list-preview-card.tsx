import Image from "next/image";
import Link from "next/link";
import { Globe2, Heart, Lock, Users } from "lucide-react";

/**
 * The single way a list is previewed anywhere on the platform: a fanned stack
 * of covers over the page background, with the name and meta underneath.
 * Sizing is percentage-based so the same markup works in the lists index, the
 * profile subpage and the narrow profile aside without per-page overrides.
 */
export function ListPreviewCard({
  list,
  covers,
  lang,
  likes = 0,
}: {
  list: {
    id: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    count: number;
  };
  covers: { url: string; name: string }[];
  lang: "pt-BR" | "en";
  likes?: number;
}) {
  const pt = lang === "pt-BR";
  const visibility =
    list.visibility === "PRIVATE"
      ? pt
        ? "Privada"
        : "Private"
      : list.visibility === "FOLLOWERS"
        ? pt
          ? "Seguidores"
          : "Followers"
        : pt
          ? "Pública"
          : "Public";
  const VisibilityIcon =
    list.visibility === "PRIVATE"
      ? Lock
      : list.visibility === "FOLLOWERS"
        ? Users
        : Globe2;
  const shown = covers.slice(0, 5);
  return (
    <Link className="list-preview" href={`/${lang}/lists/${list.id}`}>
      <span className="list-preview-stack" aria-hidden>
        {shown.length ? (
          shown.map((cover, index) => (
            <span key={`${cover.url}-${index}`}>
              <Image src={cover.url} alt="" fill sizes="120px" />
            </span>
          ))
        ) : (
          <span className="list-preview-blank" />
        )}
      </span>
      <span className="list-preview-name">{list.name}</span>
      <span className="list-preview-facts">
        <span>
          <VisibilityIcon size={11} />
          {visibility}
        </span>
        <span>
          {list.count} {pt ? "jogos" : "games"}
        </span>
        {likes > 0 && (
          <span>
            <Heart size={11} />
            {likes.toLocaleString(lang)}
          </span>
        )}
      </span>
      {list.description && (
        <span className="list-preview-note">{list.description}</span>
      )}
    </Link>
  );
}
