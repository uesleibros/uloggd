import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrganizationMark, VerifiedNameMark } from "../verified-badge";
import { ProfileLevelBadge } from "../profile-level-badge";
import type { ProfileLevel } from "@/lib/profile-level";
import { tri, type UiLang } from "@/lib/ui-text";

export type ConnectionPerson = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  account_type?: "PERSON" | "ORGANIZATION";
  /** Resolved per page of results, absent for signed-out visitors. */
  viewer_follows?: boolean;
  follows_viewer?: boolean;
};

/**
 * How the viewer already knows this person, in one short phrase.
 *
 * Scanning a followers list is mostly the question "who here do I know", and
 * answering it per row is what makes a long list navigable. Mutual is stated
 * on its own rather than as two badges, because two badges on the same card
 * read as more information than they carry.
 */
function relationshipLabel(person: ConnectionPerson, lang: UiLang) {
  if (person.viewer_follows && person.follows_viewer)
    return tri(lang, "Vocês se seguem", "You follow each other", "Se siguen");
  if (person.viewer_follows)
    return tri(lang, "Você segue", "You follow", "Lo sigues");
  if (person.follows_viewer)
    return tri(lang, "Segue você", "Follows you", "Te sigue");
  return null;
}

export function ConnectionCard({
  person,
  lang,
  standing,
}: {
  person: ConnectionPerson;
  lang: UiLang;
  /** Optional: pages that batch the levels for a whole result set pass it in. */
  standing?: ProfileLevel;
}) {
  const relationship = relationshipLabel(person, lang);
  return (
    <article className="profile-connection-card">
      <Link
        href={`/${lang}/u/${person.username}`}
        aria-label={`@${person.username}`}
      >
        <span
          className="profile-connection-avatar"
          data-account-type={person.account_type}
        >
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
            {standing && (
              <ProfileLevelBadge lang={lang} standing={standing} compact />
            )}
          </strong>
          <small>
            @{person.username}
            {relationship && (
              <b className="profile-connection-relationship">{relationship}</b>
            )}
          </small>
          {person.bio && <p>{person.bio}</p>}
        </span>
        <ArrowRight className="profile-connection-arrow" size={16} />
      </Link>
    </article>
  );
}
