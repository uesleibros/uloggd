"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { EditorVisibilitySelect } from "@/components/social/review-studio-form";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

export type LibraryVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

/**
 * Who can see this library.
 *
 * The same select every composer here uses for the same question, rather than
 * a control of its own: reviews, journal entries, screenshots and lists all
 * ask it this way, and a library that asked it differently was the reason the
 * page read as inconsistent.
 *
 * It was a two-state toggle until the read policy learned to honour
 * followers-only. Offering the middle option before that would have meant a
 * setting that did not do what it said.
 */
export function LibraryPrivacyControl({
  initial,
  lang,
}: {
  initial: LibraryVisibility;
  lang: UiLang;
}) {
  const [visibility, setVisibility] = useState<LibraryVisibility>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function choose(next: LibraryVisibility) {
    if (pending || next === visibility) return;
    setPending(true);
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "set_library_visibility",
      { next_visibility: next },
    );
    // Flipped only after the write lands. Showing the new state first and
    // reverting on failure would tell someone their library is private for a
    // moment when it is not.
    if (actionError) setError(true);
    else setVisibility(next);
    setPending(false);
  }

  return (
    <div className="library-privacy-control">
      <label>
        <span>
          {tri(
            lang,
            "Quem vê sua biblioteca",
            "Who sees your library",
            "Quién ve tu biblioteca",
          )}
        </span>
        <EditorVisibilitySelect
          value={visibility}
          onChange={(value) => void choose(value)}
          lang={lang}
        />
      </label>
      {pending && <LoaderCircle className="spin" size={14} aria-hidden />}
      {error && (
        <p role="alert">
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
