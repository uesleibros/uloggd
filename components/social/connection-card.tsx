"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrganizationMark, VerifiedNameMark } from "../verified-badge";
import { LevelMark } from "../profile-level-badge";
import { FollowButton } from "./follow-button";
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
  viewerId,
  note,
}: {
  person: ConnectionPerson;
  lang: UiLang;
  /** Optional: pages that batch the levels for a whole result set pass it in. */
  standing?: ProfileLevel;
  /** Signed-in viewer, so the card can offer to follow without a detour. */
  viewerId?: string | null;
  /**
   * Why this card is in front of the viewer, when the list is not simply
   * everyone. The suggestions shelf says how many games the two libraries
   * share; a followers list has no such reason and passes nothing.
   */
  note?: string;
}) {
  const relationship = relationshipLabel(person, lang);
  const still = useReducedMotion();
  return (
    // The article itself animates rather than gaining a wrapper: it is a grid
    // item on the connections page, and a wrapper would take that role and
    // change how the cells size.
    <motion.article
      className="profile-connection-card"
      initial={still ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        still
          ? { duration: 0 }
          : { duration: MOTION_MS.quick / 1000, ease: EASE_OUT }
      }
    >
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
            {/* Name, level, check, then the organization mark. The same order
                everywhere: the level is the account describing itself, the
                check is moderation vouching for it, and the organization mark
                is a separate claim about what kind of account this is.
                Both marks are pictures here, not buttons: the whole card is
                one link, so neither can open anything, and one reacting while
                the other ignores the click is the state worth avoiding. */}
            {standing && <LevelMark lang={lang} standing={standing} />}
            {person.verified && <VerifiedNameMark />}
            {person.account_type === "ORGANIZATION" && (
              <OrganizationMark lang={lang} />
            )}
          </strong>
          <small>
            @{person.username}
            {/* The reason first, then the relationship. On a suggestion the
                reason is the new information and the relationship is context;
                on every other list there is no reason and nothing moves. */}
            {note && (
              <b className="profile-connection-relationship profile-connection-reason">
                {note}
              </b>
            )}
            {relationship && (
              <b className="profile-connection-relationship">{relationship}</b>
            )}
          </small>
          {person.bio && <p>{person.bio}</p>}
        </span>
        <ArrowRight className="profile-connection-arrow" size={16} />
      </Link>
      {/* Outside the link: a button nested in an anchor is invalid, and
          following someone from a list should not also navigate to them.
          `viewer_follows` is resolved per page of results and is absent for
          signed-out visitors, where this renders nothing. */}

      <FollowButton
        viewerId={viewerId ?? null}
        profileId={person.id}
        initial={Boolean(person.viewer_follows)}
        profileName={person.display_name || `@${person.username}`}
        lang={lang}
      />
    </motion.article>
  );
}
