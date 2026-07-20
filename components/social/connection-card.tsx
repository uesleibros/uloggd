import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VerifiedMark } from "../verified-badge";
import { stripMarkdown } from "@/lib/markdown-text";

export type ConnectionPerson = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
};

export function ConnectionCard({
  person,
  lang,
}: {
  person: ConnectionPerson;
  lang: "pt-BR" | "en";
}) {
  return (
    <article className="profile-connection-card">
      <Link
        href={`/${lang}/u/${person.username}`}
        aria-label={`@${person.username}`}
      >
        <span className="profile-connection-avatar">
          {person.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt=""
              fill
              sizes="52px"
              unoptimized
            />
          ) : (
            person.username.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="profile-connection-copy">
          <strong>
            <span>{person.display_name || `@${person.username}`}</span>
            {person.verified && <VerifiedMark size={16} />}
          </strong>
          <small>@{person.username}</small>
          {person.bio && <p>{stripMarkdown(person.bio)}</p>}
        </span>
        <ArrowRight className="profile-connection-arrow" size={16} />
      </Link>
    </article>
  );
}
