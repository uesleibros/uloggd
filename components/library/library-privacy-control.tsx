"use client";

import { Check, Globe2, LoaderCircle, LockKeyhole, Users } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

export type LibraryVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

/**
 * Who can see this library.
 *
 * Was a two-state toggle while every other surface here offered three. The
 * middle setting existed in the database the whole time and had no policy
 * behind it, so it is only offered now that following is actually honoured on
 * read; a privacy control that does not do what it says is the one kind of bug
 * people cannot detect for themselves.
 *
 * Three explicit choices rather than a cycling button, because a toggle that
 * walks through three states makes someone click twice to find out where they
 * are, and this is a setting they should be able to read at a glance.
 */
const OPTIONS: LibraryVisibility[] = ["PUBLIC", "FOLLOWERS", "PRIVATE"];

export function LibraryPrivacyControl({
  initial,
  lang,
}: {
  initial: LibraryVisibility;
  lang: UiLang;
}) {
  const [visibility, setVisibility] = useState<LibraryVisibility>(initial);
  const [pending, setPending] = useState<LibraryVisibility | null>(null);
  const [error, setError] = useState(false);

  async function choose(next: LibraryVisibility) {
    if (pending || next === visibility) return;
    setPending(next);
    setError(false);
    // Flipped only after the write lands: showing the new state first and
    // reverting on failure would tell someone their library is private for a
    // moment when it is not.
    const { error: actionError } = await createClient().rpc(
      "set_library_visibility",
      { next_visibility: next },
    );
    if (actionError) setError(true);
    else setVisibility(next);
    setPending(null);
  }

  const copy = (value: LibraryVisibility) => {
    if (value === "PUBLIC")
      return {
        icon: <Globe2 size={16} />,
        title: tri(lang, "Pública", "Public", "Pública"),
        body: tri(
          lang,
          "Qualquer pessoa pode ver.",
          "Anyone can see it.",
          "Cualquiera puede verla.",
        ),
      };
    if (value === "FOLLOWERS")
      return {
        icon: <Users size={16} />,
        title: tri(lang, "Seguidores", "Followers", "Seguidores"),
        body: tri(
          lang,
          "Só quem segue você.",
          "Only people who follow you.",
          "Solo quienes te siguen.",
        ),
      };
    return {
      icon: <LockKeyhole size={16} />,
      title: tri(lang, "Privada", "Private", "Privada"),
      body: tri(lang, "Somente você.", "Only you.", "Solo tú."),
    };
  };

  return (
    <div className="visibility-choice">
      <span className="visibility-choice-label">
        {tri(
          lang,
          "Quem vê sua biblioteca",
          "Who sees your library",
          "Quién ve tu biblioteca",
        )}
      </span>
      <div role="radiogroup">
        {OPTIONS.map((value) => {
          const { icon, title, body } = copy(value);
          const active = visibility === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active || undefined}
              disabled={pending !== null}
              onClick={() => void choose(value)}
            >
              {pending === value ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                icon
              )}
              <span>
                <strong>{title}</strong>
                <small>{body}</small>
              </span>
              {active && <Check size={15} aria-hidden />}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="visibility-choice-error" role="alert">
          {tri(
            lang,
            "Não foi possível alterar.",
            "Could not update.",
            "No se pudo cambiar.",
          )}
        </p>
      )}
    </div>
  );
}
