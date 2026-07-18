import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Globe2, Heart, Lock, Users } from "lucide-react";

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
  return (
    <Link className="list-preview-card" href={`/${lang}/lists/${list.id}`}>
      <div className="list-cover-strip" data-count={covers.length}>
        {covers.slice(0, 5).map((cover, index) => (
          <span key={`${cover.url}-${index}`}>
            <Image src={cover.url} alt={cover.name} fill sizes="160px" />
          </span>
        ))}
        {Array.from({ length: Math.max(0, 5 - covers.length) }, (_, index) => (
          <span className="list-cover-placeholder" key={`empty-${index}`} />
        ))}
      </div>
      <div className="list-preview-copy">
        <div className="list-preview-meta">
          <span>
            <VisibilityIcon size={12} /> {visibility}
          </span>
          <small>
            {list.count} {pt ? "jogos" : "games"}
            {likes > 0 && (
              <>
                {" · "}
                <Heart size={10} /> {likes.toLocaleString(lang)}
              </>
            )}
          </small>
        </div>
        <div className="list-preview-title">
          <h2>{list.name}</h2>
          <ArrowUpRight size={17} />
        </div>
        {list.description && <p>{list.description}</p>}
      </div>
    </Link>
  );
}
