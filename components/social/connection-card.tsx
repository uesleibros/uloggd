import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrganizationMark, VerifiedNameMark } from "../verified-badge";
import type { UiLang } from "@/lib/ui-text";

export type ConnectionPerson = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  account_type?: "PERSON" | "ORGANIZATION";
};

export function ConnectionCard({
  person,
  lang,
}: {
  person: ConnectionPerson;
  lang: UiLang;
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
            {person.account_type === "ORGANIZATION" && (
              <OrganizationMark lang={lang} />
            )}
            {person.verified && <VerifiedNameMark />}
          </strong>
          <small>@{person.username}</small>
          {person.bio && <p>{person.bio}</p>}
        </span>
        <ArrowRight className="profile-connection-arrow" size={16} />
      </Link>
    </article>
  );
}
